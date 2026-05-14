import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/environment.dart';
import '../models/api_failure.dart';

class ApiService {
  static String? _token;
  static final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Initialize from secure storage. Call this before runApp.
  static Future<void> init() async {
    try {
      _token = await _storage.read(key: 'jwt_token');
    } catch (_) {
      _token = null;
    }
  }

  static bool hasToken() => _token != null;

  // Persist or clear token. Returns after persistence completes.
  static Future<void> setToken(String? token) async {
    _token = token;
    try {
      if (token != null) {
        await _storage.write(key: 'jwt_token', value: token);
      } else {
        await _storage.delete(key: 'jwt_token');
      }
    } catch (_) {
      // ignore storage errors; token is still kept in memory
    }
  }

  static Map<String, String> _headers({bool includeAuth = false}) {
    final headers = {'Content-Type': 'application/json'};
    if (includeAuth && _token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  /// Maps HTTP status codes and exceptions to typed ApiFailure
  static ApiFailure _mapFailure(dynamic error, int? statusCode, String? body) {
    try {
      if (error is http.ClientException) {
        return NetworkFailure(message: error.message);
      }

      if (statusCode != null && body != null) {
        final data = jsonDecode(body);
        final message = data['message']?.toString() ?? 'Unknown error';

        switch (statusCode) {
          case 400:
            return ValidationFailure(message: message);
          case 401:
            return UnauthorizedFailure(message: message);
          case 403:
            return ForbiddenFailure(message: message);
          case 404:
            return NotFoundFailure(message: message);
          case 409:
            return ConflictFailure(message: message);
          case >= 500:
            return ServerFailure(message: message);
        }
      }

      return UnknownFailure(message: error.toString());
    } catch (_) {
      return UnknownFailure(message: 'Failed to parse error response');
    }
  }

  // AUTH ENDPOINTS
  static Future<Map<String, dynamic>> signup(
      String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse("${Environment.apiBaseUrl}/auth/signup"),
        headers: _headers(),
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await setToken(data['token']);
        return data;
      } else {
        throw _mapFailure(null, response.statusCode, response.body);
      }
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse("${Environment.apiBaseUrl}/auth/login"),
        headers: _headers(),
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await setToken(data['token']);
        return data;
      } else {
        // 401 on login: invalid credentials → ValidationFailure
        throw _mapFailure(null, response.statusCode, response.body);
      }
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  // GET SERVICES
  static Future<Map<String, dynamic>> getServices(
      {int page = 1, int limit = 10, String? category, String? search}) async {
    try {
      final queryParameters = <String, String>{
        'page': page.toString(),
        'limit': limit.toString(),
      };
      if (category != null && category.isNotEmpty) {
        queryParameters['category'] = category;
      }
      if (search != null && search.isNotEmpty) {
        queryParameters['search'] = search;
      }

      final uri = Uri.parse("${Environment.apiBaseUrl}/services")
          .replace(queryParameters: queryParameters);

      final response = await http.get(
        uri,
        headers: _headers(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data as Map<String, dynamic>;
      } else {
        throw _mapFailure(null, response.statusCode, response.body);
      }
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  // CART ENDPOINTS
  static Future<Map<String, dynamic>> getCart() async {
    try {
      final response = await http.get(
        Uri.parse("${Environment.apiBaseUrl}/cart"),
        headers: _headers(includeAuth: true),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        // Token expired → clear and throw UnauthorizedFailure
        await setToken(null);
        throw _mapFailure(null, response.statusCode, response.body);
      } else {
        throw _mapFailure(null, response.statusCode, response.body);
      }
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<Map<String, dynamic>> addToCart(
    String serviceId,
    String date,
    String timeSlot, {
    int quantity = 1,
  }) async {
    try {
      final response = await http.post(
        Uri.parse("${Environment.apiBaseUrl}/cart/add"),
        headers: _headers(includeAuth: true),
        body: jsonEncode({
          'serviceId': serviceId,
          'date': date,
          'timeSlot': timeSlot,
          'quantity': quantity,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<Map<String, dynamic>> updateCartItem(
    String itemId, {
    int? quantity,
    String? date,
    String? timeSlot,
  }) async {
    try {
      final response = await http.patch(
        Uri.parse("${Environment.apiBaseUrl}/cart/$itemId"),
        headers: _headers(includeAuth: true),
        body: jsonEncode({
          if (quantity != null) 'quantity': quantity,
          if (date != null) 'date': date,
          if (timeSlot != null) 'timeSlot': timeSlot,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<Map<String, dynamic>> removeCartItem(String itemId) async {
    try {
      final response = await http.delete(
        Uri.parse("${Environment.apiBaseUrl}/cart/$itemId"),
        headers: _headers(includeAuth: true),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  // BOOKING ENDPOINTS
  static Future<Map<String, dynamic>> checkout(
      {String paymentMethod = 'cash'}) async {
    try {
      final response = await http.post(
        Uri.parse("${Environment.apiBaseUrl}/bookings/checkout"),
        headers: _headers(includeAuth: true),
        body: jsonEncode({'paymentMethod': paymentMethod}),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<List<dynamic>> getBookings() async {
    try {
      final response = await http.get(
        Uri.parse("${Environment.apiBaseUrl}/bookings"),
        headers: _headers(includeAuth: true),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<Map<String, dynamic>> getBookingById(String bookingId) async {
    try {
      final response = await http.get(
        Uri.parse("${Environment.apiBaseUrl}/bookings/$bookingId"),
        headers: _headers(includeAuth: true),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<Map<String, dynamic>> cancelBooking(String bookingId) async {
    try {
      final response = await http.post(
        Uri.parse("${Environment.apiBaseUrl}/bookings/$bookingId/cancel"),
        headers: _headers(includeAuth: true),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }

  static Future<Map<String, dynamic>> payBooking(String bookingId) async {
    try {
      final response = await http.post(
        Uri.parse("${Environment.apiBaseUrl}/bookings/$bookingId/pay"),
        headers: _headers(includeAuth: true),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        await setToken(null);
      }
      throw _mapFailure(null, response.statusCode, response.body);
    } on ApiFailure {
      rethrow;
    } catch (e) {
      throw _mapFailure(e, null, null);
    }
  }
}
