import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../repositories/booking_repository.dart';

sealed class BookingEvent extends Equatable {
  const BookingEvent();

  @override
  List<Object?> get props => [];
}

final class BookingCheckoutRequested extends BookingEvent {
  const BookingCheckoutRequested({this.paymentMethod = 'cash'});
  final String paymentMethod;

  @override
  List<Object?> get props => [paymentMethod];
}

final class BookingListRequested extends BookingEvent {
  const BookingListRequested();
}

final class BookingCancelRequested extends BookingEvent {
  const BookingCancelRequested(this.bookingId);
  final String bookingId;

  @override
  List<Object?> get props => [bookingId];
}

final class BookingPayRequested extends BookingEvent {
  const BookingPayRequested(this.bookingId);
  final String bookingId;

  @override
  List<Object?> get props => [bookingId];
}

sealed class BookingState extends Equatable {
  const BookingState();

  @override
  List<Object?> get props => [];
}

final class BookingInitial extends BookingState {
  const BookingInitial();
}

final class BookingLoading extends BookingState {
  const BookingLoading();
}

final class BookingSuccess extends BookingState {
  const BookingSuccess(this.booking);
  final Map<String, dynamic> booking;

  @override
  List<Object?> get props => [booking];
}

final class BookingListLoaded extends BookingState {
  const BookingListLoaded(this.bookings);
  final List<dynamic> bookings;

  @override
  List<Object?> get props => [bookings];
}

final class BookingFailure extends BookingState {
  const BookingFailure(this.message);
  final String message;

  @override
  List<Object?> get props => [message];
}

class BookingBloc extends Bloc<BookingEvent, BookingState> {
  BookingBloc(this._repository) : super(const BookingInitial()) {
    on<BookingCheckoutRequested>(_onCheckout);
    on<BookingListRequested>(_onListRequested);
    on<BookingCancelRequested>(_onCancelRequested);
    on<BookingPayRequested>(_onPayRequested);
  }

  final BookingRepository _repository;

  Future<void> _onCheckout(
      BookingCheckoutRequested event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    try {
      final booking =
          await _repository.checkout(paymentMethod: event.paymentMethod);
      emit(BookingSuccess(booking));
    } catch (error) {
      emit(BookingFailure(error.toString()));
    }
  }

  Future<void> _onListRequested(
      BookingListRequested event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    try {
      final bookings = await _repository.fetchBookings();
      emit(BookingListLoaded(bookings));
    } catch (error) {
      emit(BookingFailure(error.toString()));
    }
  }

  Future<void> _onCancelRequested(
      BookingCancelRequested event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    try {
      final booking = await _repository.cancelBooking(event.bookingId);
      emit(BookingSuccess(booking));
    } catch (error) {
      emit(BookingFailure(error.toString()));
    }
  }

  Future<void> _onPayRequested(
      BookingPayRequested event, Emitter<BookingState> emit) async {
    emit(const BookingLoading());
    try {
      final booking = await _repository.payBooking(event.bookingId);
      emit(BookingSuccess(booking));
    } catch (error) {
      emit(BookingFailure(error.toString()));
    }
  }
}
