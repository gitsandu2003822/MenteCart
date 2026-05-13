import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = "http://192.168.1.100:5001";
  static String? _token;

  static void setToken(String? token) {
    _token = token;
  }

  static Map<String, String> _headers({bool includeAuth = false}) {
    final headers = {'Content-Type': 'application/json'};
    if (includeAuth && _token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  // AUTH ENDPOINTS
  static Future<Map<String, dynamic>> signup(String email, String password) async {
    final response = await http.post(
      Uri.parse("$baseUrl/auth/signup"),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = jsonDecode(response.body);
      setToken(data['token']);
      return data;
    } else {
      throw Exception(jsonDecode(response.body)['message'] ?? 'Signup failed');
    }
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse("$baseUrl/auth/login"),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      setToken(data['token']);
      return data;
    } else {
      throw Exception(jsonDecode(response.body)['message'] ?? 'Login failed');
    }
  }

  // GET SERVICES
  static Future<List<dynamic>> getServices() async {
    final response = await http.get(
      Uri.parse("$baseUrl/services"),
      headers: _headers(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data["data"];
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
      throw Exception(jsonDecode(response.body)['message'] ?? 'Failed to add to cart');
    }
  }

  // BOOKING ENDPOINTS
  static Future<Map<String, dynamic>> checkout({String paymentMethod = 'cash'}) async {
    final response = await http.post(
      Uri.parse("$baseUrl/bookings/checkout"),
      headers: _headers(includeAuth: true),
      body: jsonEncode({'paymentMethod': paymentMethod}),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception(jsonDecode(response.body)['message'] ?? 'Checkout failed');
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
}
