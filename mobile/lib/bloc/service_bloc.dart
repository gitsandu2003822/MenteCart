import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/api_failure.dart';
import '../repositories/service_repository.dart';

sealed class ServiceEvent extends Equatable {
  const ServiceEvent();

  @override
  List<Object?> get props => [];
}

final class ServiceRequested extends ServiceEvent {
  const ServiceRequested();
}

sealed class ServiceState extends Equatable {
  const ServiceState();

  @override
  List<Object?> get props => [];
}

final class ServiceInitial extends ServiceState {
  const ServiceInitial();
}

final class ServiceLoading extends ServiceState {
  const ServiceLoading();
}

final class ServiceLoaded extends ServiceState {
  const ServiceLoaded(this.services);

  final List<Map<String, dynamic>> services;

  @override
  List<Object?> get props => [services];
}

final class ServiceFailure extends ServiceState {
  const ServiceFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

class ServiceBloc extends Bloc<ServiceEvent, ServiceState> {
  ServiceBloc(this._repository) : super(const ServiceInitial()) {
    on<ServiceRequested>(_onRequested);
  }

  final ServiceRepository _repository;

  Future<void> _onRequested(
      ServiceRequested event, Emitter<ServiceState> emit) async {
    emit(const ServiceLoading());

    try {
      final services = await _repository.fetchServices();
      emit(ServiceLoaded(services));
    } on ApiFailure catch (e) {
      emit(ServiceFailure(e.message));
    } catch (error) {
      emit(ServiceFailure(error.toString()));
    }
  }
}
