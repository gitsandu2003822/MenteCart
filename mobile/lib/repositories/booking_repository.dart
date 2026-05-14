import '../services/api_service.dart';

class BookingRepository {
  Future<Map<String, dynamic>> checkout({String paymentMethod = 'cash'}) async {
    return await ApiService.checkout(paymentMethod: paymentMethod);
  }

  Future<List<dynamic>> fetchBookings() async {
    return await ApiService.getBookings();
  }

  Future<Map<String, dynamic>> fetchBookingById(String bookingId) async {
    return await ApiService.getBookingById(bookingId);
  }

  Future<Map<String, dynamic>> cancelBooking(String bookingId) async {
    return await ApiService.cancelBooking(bookingId);
  }

  Future<Map<String, dynamic>> payBooking(String bookingId) async {
    return await ApiService.payBooking(bookingId);
  }
}
