import '../services/api_service.dart';

class AuthRepository {
  Future<Map<String, dynamic>> signup(String email, String password) async {
    return await ApiService.signup(email, password);
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    return await ApiService.login(email, password);
  }
}
