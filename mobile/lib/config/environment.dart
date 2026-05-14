/// Environment configuration loaded from --dart-define
class Environment {
  // API base URL from --dart-define, defaults to local development
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.1.100:5001');

  // Token refresh endpoint (if implementing refresh tokens later)
  static const String tokenRefreshEndpoint = '/auth/refresh';

  /// Returns true if running in debug mode
  static bool get isDebug {
    return const bool.fromEnvironment('DEBUG', defaultValue: true);
  }
}
