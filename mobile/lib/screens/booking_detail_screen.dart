import 'package:flutter/material.dart';

import '../repositories/booking_repository.dart';

class BookingDetailScreen extends StatefulWidget {
  const BookingDetailScreen({super.key, required this.bookingId});

  final String bookingId;

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  final BookingRepository _repository = BookingRepository();

  bool _isLoading = true;
  bool _isProcessingAction = false;
  String? _error;
  Map<String, dynamic>? _booking;

  @override
  void initState() {
    super.initState();
    _loadBooking();
  }

  Future<void> _loadBooking() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final booking = await _repository.fetchBookingById(widget.bookingId);
      setState(() {
        _booking = booking;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _cancelBooking() async {
    setState(() => _isProcessingAction = true);
    try {
      final updated = await _repository.cancelBooking(widget.bookingId);
      setState(() {
        _booking = updated;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking cancelled successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessingAction = false);
      }
    }
  }

  Future<void> _payBooking() async {
    setState(() => _isProcessingAction = true);
    try {
      final updated = await _repository.payBooking(widget.bookingId);
      setState(() {
        _booking = updated;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Payment successful, booking confirmed')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessingAction = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Booking Details')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _loadBooking,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final booking = _booking;
    if (booking == null) {
      return const Center(child: Text('No booking data'));
    }

    final status = booking['status']?.toString() ?? 'unknown';
    final paymentStatus = booking['paymentStatus']?.toString() ?? 'unknown';
    final paymentMethod = booking['paymentMethod']?.toString() ?? 'unknown';
    final items = (booking['items'] as List<dynamic>? ?? const []);
    final statusHistory =
        (booking['statusHistory'] as List<dynamic>? ?? const []);

    final canCancel = status != 'cancelled' && status != 'completed';
    final canPay = status == 'pending' && paymentMethod == 'card';

    final bookingIdRaw = booking['_id']?.toString() ?? '';
    final bookingIdShort =
        bookingIdRaw.length >= 8 ? bookingIdRaw.substring(0, 8) : bookingIdRaw;

    return RefreshIndicator(
      onRefresh: _loadBooking,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Booking #${bookingIdShort.isEmpty ? 'N/A' : bookingIdShort}',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text('Status: $status'),
          Text('Payment: $paymentStatus ($paymentMethod)'),
          Text('Created: ${booking['createdAt'] ?? '-'}'),
          const SizedBox(height: 16),
          const Text('Items',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...items.map((item) {
            final service = item['serviceId'];
            final title = service is Map<String, dynamic>
                ? (service['title']?.toString() ?? 'Service')
                : 'Service';
            final quantity = item['quantity']?.toString() ?? '1';
            final date = item['date']?.toString() ?? '-';
            final slot = item['timeSlot']?.toString() ?? '-';
            return Card(
              child: ListTile(
                title: Text(title),
                subtitle: Text('$date at $slot • qty: $quantity'),
              ),
            );
          }),
          const SizedBox(height: 16),
          const Text('Status History',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (statusHistory.isEmpty)
            const Text('No history yet')
          else
            ...statusHistory.map((entry) {
              final historyStatus = entry['status']?.toString() ?? '-';
              final changedAt = entry['changedAt']?.toString() ?? '-';
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.history),
                title: Text(historyStatus),
                subtitle: Text(changedAt),
              );
            }),
          const SizedBox(height: 12),
          if (canPay)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isProcessingAction ? null : _payBooking,
                child: Text(_isProcessingAction
                    ? 'Processing...'
                    : 'Pay Now (Simulate)'),
              ),
            ),
          if (canPay) const SizedBox(height: 8),
          if (canCancel)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _isProcessingAction ? null : _cancelBooking,
                child: Text(
                    _isProcessingAction ? 'Processing...' : 'Cancel Booking'),
              ),
            ),
        ],
      ),
    );
  }
}
