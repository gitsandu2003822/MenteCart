import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String baseUrl = "http://192.168.1.100:5001";
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

  // AUTH ENDPOINTS
  static Future<Map<String, dynamic>> signup(
      String email, String password) async {
    final response = await http.post(
      Uri.parse("$baseUrl/auth/signup"),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await setToken(data['token']);
      return data;
    } else {
      throw Exception(jsonDecode(response.body)['message'] ?? 'Signup failed');
    }
  }

  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final response = await http.post(
      Uri.parse("$baseUrl/auth/login"),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await setToken(data['token']);
      return data;
    } else {
      throw Exception(jsonDecode(response.body)['message'] ?? 'Login failed');
    }
  }

  // GET SERVICES
  static Future<Map<String, dynamic>> getServices(
      {int page = 1, int limit = 10, String? category, String? search}) async {
    final queryParameters = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (category != null && category.isNotEmpty)
      queryParameters['category'] = category;
    if (search != null && search.isNotEmpty) queryParameters['search'] = search;

    final uri = Uri.parse("$baseUrl/services")
        .replace(queryParameters: queryParameters);

    final response = await http.get(
      uri,
      headers: _headers(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data as Map<String, dynamic>;
    } else {
      throw Exception("Failed to load services");
    }
  }

  // CART ENDPOINTS
  static Future<Map<String, dynamic>> getCart() async {
    final response = await http.get(
      Uri.parse("$baseUrl/cart"),
      headers: _headers(includeAuth: true),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to fetch cart");
    }
  }

  static Future<Map<String, dynamic>> addToCart(
    String serviceId,
    String date,
    String timeSlot, {
    int quantity = 1,
  }) async {
    final response = await http.post(
      Uri.parse("$baseUrl/cart/add"),
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
    } else {
      throw Exception(
          jsonDecode(response.body)['message'] ?? 'Failed to add to cart');
    }
  }

  static Future<Map<String, dynamic>> updateCartItem(
    String itemId, {
    int? quantity,
    String? date,
    String? timeSlot,
  }) async {
    final response = await http.patch(
      Uri.parse("$baseUrl/cart/$itemId"),
      headers: _headers(includeAuth: true),
      body: jsonEncode({
        if (quantity != null) 'quantity': quantity,
        if (date != null) 'date': date,
        if (timeSlot != null) 'timeSlot': timeSlot,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final body = jsonDecode(response.body);
      final message =
          body['message']?.toString() ?? 'Failed to update cart item';
      throw Exception('HTTP_${response.statusCode}:$message');
    }
  }

  static Future<Map<String, dynamic>> removeCartItem(String itemId) async {
    final response = await http.delete(
      Uri.parse("$baseUrl/cart/$itemId"),
      headers: _headers(includeAuth: true),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to remove cart item");
    }
  }

  // BOOKING ENDPOINTS
  static Future<Map<String, dynamic>> checkout(
      {String paymentMethod = 'cash'}) async {
    final response = await http.post(
      Uri.parse("$baseUrl/bookings/checkout"),
      headers: _headers(includeAuth: true),
      body: jsonEncode({'paymentMethod': paymentMethod}),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception(
          jsonDecode(response.body)['message'] ?? 'Checkout failed');
    }
  }

  static Future<List<dynamic>> getBookings() async {
    final response = await http.get(
      Uri.parse("$baseUrl/bookings"),
      headers: _headers(includeAuth: true),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to fetch bookings");
    }
  }

  static Future<Map<String, dynamic>> getBookingById(String bookingId) async {
    final response = await http.get(
      Uri.parse("$baseUrl/bookings/$bookingId"),
      headers: _headers(includeAuth: true),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['message'] ?? 'Failed to fetch booking details');
    }
  }

  static Future<Map<String, dynamic>> cancelBooking(String bookingId) async {
    final response = await http.post(
      Uri.parse("$baseUrl/bookings/$bookingId/cancel"),
      headers: _headers(includeAuth: true),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['message'] ?? 'Failed to cancel booking');
    }
  }

  static Future<Map<String, dynamic>> payBooking(String bookingId) async {
    final response = await http.post(
      Uri.parse("$baseUrl/bookings/$bookingId/pay"),
      headers: _headers(includeAuth: true),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['message'] ?? 'Payment failed');
    }
  }
}
