import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/api_failure.dart';
import '../repositories/auth_repository.dart';
import '../services/api_service.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

final class AuthSignupRequested extends AuthEvent {
  const AuthSignupRequested(this.email, this.password);
  final String email;
  final String password;

  @override
  List<Object?> get props => [email, password];
}

final class AuthLoginRequested extends AuthEvent {
  const AuthLoginRequested(this.email, this.password);
  final String email;
  final String password;

  @override
  List<Object?> get props => [email, password];
}

final class AuthGoogleLoginRequested extends AuthEvent {
  const AuthGoogleLoginRequested();
}

final class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

final class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

sealed class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

final class AuthInitial extends AuthState {
  const AuthInitial();
}

final class AuthLoading extends AuthState {
  const AuthLoading();
}

final class AuthSuccess extends AuthState {
  const AuthSuccess(this.user);
  final Map<String, dynamic> user;

  @override
  List<Object?> get props => [user];
}

final class AuthFailure extends AuthState {
  const AuthFailure(this.message);
  final String message;

  @override
  List<Object?> get props => [message];
}

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._repository) : super(const AuthInitial()) {
    on<AuthSignupRequested>(_onSignup);
    on<AuthLoginRequested>(_onLogin);
    on<AuthGoogleLoginRequested>(_onGoogleLogin);
    on<AuthLogoutRequested>(_onLogout);
    on<AuthCheckRequested>(_onAuthCheck);
  }

  final AuthRepository _repository;

  Future<void> _onAuthCheck(
      AuthCheckRequested event, Emitter<AuthState> emit) async {
    // Check if a token exists from a previous session
    if (ApiService.hasToken()) {
      // If token exists, emit success state to skip login screen
      emit(const AuthSuccess({'isRestored': true}));
    }
  }

  Future<void> _onSignup(
      AuthSignupRequested event, Emitter<AuthState> emit) async {
    emit(const AuthLoading());
    try {
      final result = await _repository.signup(event.email, event.password);
      emit(AuthSuccess(result['user']));
    } on ApiFailure catch (e) {
      emit(AuthFailure(e.message));
    } catch (error) {
      emit(AuthFailure(error.toString()));
    }
  }

  Future<void> _onLogin(
      AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(const AuthLoading());
    try {
      final result = await _repository.login(event.email, event.password);
      emit(AuthSuccess(result['user']));
    } on ApiFailure catch (e) {
      emit(AuthFailure(e.message));
    } catch (error) {
      emit(AuthFailure(error.toString()));
    }
  }

  Future<void> _onGoogleLogin(
      AuthGoogleLoginRequested event, Emitter<AuthState> emit) async {
    emit(const AuthLoading());
    try {
      final result = await _repository.googleLogin();
      emit(AuthSuccess(result['user']));
    } on ApiFailure catch (e) {
      emit(AuthFailure(e.message));
    } catch (error) {
      emit(AuthFailure(error.toString()));
    }
  }

  Future<void> _onLogout(
      AuthLogoutRequested event, Emitter<AuthState> emit) async {
    // Clear persisted token and reset state
    await ApiService.setToken(null);
    emit(const AuthInitial());
  }
}
