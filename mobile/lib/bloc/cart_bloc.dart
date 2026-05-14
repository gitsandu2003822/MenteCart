import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/api_failure.dart';
import '../repositories/cart_repository.dart';

sealed class CartEvent extends Equatable {
  const CartEvent();

  @override
  List<Object?> get props => [];
}

final class CartFetchRequested extends CartEvent {
  const CartFetchRequested();
}

final class CartItemAdded extends CartEvent {
  const CartItemAdded(this.serviceId, this.date, this.timeSlot,
      {this.quantity = 1});
  final String serviceId;
  final String date;
  final String timeSlot;
  final int quantity;

  @override
  List<Object?> get props => [serviceId, date, timeSlot, quantity];
}

final class CartItemRemoved extends CartEvent {
  const CartItemRemoved(this.itemId);
  final String itemId;

  @override
  List<Object?> get props => [itemId];
}

final class CartItemUpdated extends CartEvent {
  const CartItemUpdated(this.itemId, {this.quantity, this.date, this.timeSlot});
  final String itemId;
  final int? quantity;
  final String? date;
  final String? timeSlot;

  @override
  List<Object?> get props => [itemId, quantity, date, timeSlot];
}

sealed class CartState extends Equatable {
  const CartState();

  @override
  List<Object?> get props => [];
}

final class CartInitial extends CartState {
  const CartInitial();
}

final class CartLoading extends CartState {
  const CartLoading();
}

final class CartLoaded extends CartState {
  const CartLoaded(this.cart);
  final Map<String, dynamic> cart;

  @override
  List<Object?> get props => [cart];
}

final class CartFailure extends CartState {
  const CartFailure(this.message);
  final String message;

  @override
  List<Object?> get props => [message];
}

class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc(this._repository) : super(const CartInitial()) {
    on<CartFetchRequested>(_onFetch);
    on<CartItemAdded>(_onAddItem);
    on<CartItemRemoved>(_onRemoveItem);
    on<CartItemUpdated>(_onUpdateItem);
  }

  final CartRepository _repository;

  Future<void> _onFetch(
      CartFetchRequested event, Emitter<CartState> emit) async {
    emit(const CartLoading());
    try {
      final cart = await _repository.fetchCart();
      emit(CartLoaded(cart));
    } on ApiFailure catch (e) {
      emit(CartFailure(e.message));
    } catch (error) {
      emit(CartFailure(error.toString()));
    }
  }

  Future<void> _onAddItem(CartItemAdded event, Emitter<CartState> emit) async {
    emit(const CartLoading());
    try {
      final cart = await _repository.addItem(
          event.serviceId, event.date, event.timeSlot,
          quantity: event.quantity);
      emit(CartLoaded(cart));
    } on ConflictFailure {
      emit(CartFailure('DUPLICATE_SLOT:${event.serviceId}'));
    } on ApiFailure catch (e) {
      emit(CartFailure(e.message));
    } catch (error) {
      emit(CartFailure(error.toString()));
    }
  }

  Future<void> _onRemoveItem(
      CartItemRemoved event, Emitter<CartState> emit) async {
    emit(const CartLoading());
    try {
      final cart = await _repository.removeItem(event.itemId);
      emit(CartLoaded(cart));
    } on ApiFailure catch (e) {
      emit(CartFailure(e.message));
    } catch (error) {
      emit(CartFailure(error.toString()));
    }
  }

  Future<void> _onUpdateItem(
      CartItemUpdated event, Emitter<CartState> emit) async {
    emit(const CartLoading());
    try {
      final cart = await _repository.updateItem(
        event.itemId,
        quantity: event.quantity,
        date: event.date,
        timeSlot: event.timeSlot,
      );
      emit(CartLoaded(cart));
    } on ConflictFailure {
      emit(CartFailure('DUPLICATE_SLOT:${event.itemId}'));
    } on ApiFailure catch (e) {
      emit(CartFailure(e.message));
    } catch (error) {
      emit(CartFailure(error.toString()));
    }
  }
}
