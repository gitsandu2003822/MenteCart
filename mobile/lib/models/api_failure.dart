import 'package:equatable/equatable.dart';

/// Typed API failure class for centralized error mapping
sealed class ApiFailure extends Equatable {
  const ApiFailure(this.message);
  final String message;

  @override
  List<Object?> get props => [message];
}

/// Unauthorized (401) - token expired/invalid
final class UnauthorizedFailure extends ApiFailure {
  const UnauthorizedFailure({
    String message = 'Unauthorized. Please login again.',
  }) : super(message);
}

/// Forbidden (403) - insufficient permissions
final class ForbiddenFailure extends ApiFailure {
  const ForbiddenFailure({
    String message = 'Access forbidden.',
  }) : super(message);
}

/// Not Found (404)
final class NotFoundFailure extends ApiFailure {
  const NotFoundFailure({
    String message = 'Resource not found.',
  }) : super(message);
}

/// Conflict (409) - duplicate slot, overbooking, etc.
final class ConflictFailure extends ApiFailure {
  const ConflictFailure({
    required String message,
  }) : super(message);
}

/// Validation/Bad Request (400)
final class ValidationFailure extends ApiFailure {
  const ValidationFailure({
    required String message,
  }) : super(message);
}

/// Server error (500+)
final class ServerFailure extends ApiFailure {
  const ServerFailure({
    String message = 'Server error. Please try again.',
  }) : super(message);
}

/// Network/connection error
final class NetworkFailure extends ApiFailure {
  const NetworkFailure({
    String message = 'Network error. Check your connection.',
  }) : super(message);
}

/// Unknown/unparseable error
final class UnknownFailure extends ApiFailure {
  const UnknownFailure({
    required String message,
  }) : super(message);
}
