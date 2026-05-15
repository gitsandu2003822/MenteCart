import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../config/environment.dart';
import '../../../models/api_failure.dart';
import '../../../services/api_service.dart';

class GoogleAuthService {
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: Environment.apiBaseUrl,
      headers: {'Content-Type': 'application/json'},
    ),
  );

  Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        throw const UnknownFailure(message: 'Google sign-in cancelled');
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential =
          await _firebaseAuth.signInWithCredential(credential);
      final firebaseToken = await userCredential.user?.getIdToken();

      if (firebaseToken == null) {
        throw const UnknownFailure(message: 'Unable to obtain Firebase token');
      }

      final response = await _dio.post(
        '/auth/google',
        data: {'token': firebaseToken},
      );

      final data = Map<String, dynamic>.from(response.data as Map);
      final backendToken = data['token']?.toString();

      if (backendToken == null || backendToken.isEmpty) {
        throw const UnknownFailure(message: 'Backend token missing');
      }

      await ApiService.setToken(backendToken);
      return data;
    } catch (error) {
      if (error is ApiFailure) {
        rethrow;
      }
      throw UnknownFailure(message: error.toString());
    }
  }
}
