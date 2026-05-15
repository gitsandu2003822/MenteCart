import '../features/auth/data/google_auth_service.dart';
import '../models/api_failure.dart';
import '../services/api_service.dart';

class AuthRepository {
  Future<Map<String, dynamic>> signup(String email, String password) async {
    return await ApiService.signup(email, password);
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    return await ApiService.login(email, password);
  }

  Future<Map<String, dynamic>> googleLogin() async {
    try {
      return await GoogleAuthService().signInWithGoogle();
    } on ApiFailure {
      rethrow;
    }
  }
}
