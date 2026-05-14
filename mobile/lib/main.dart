import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'bloc/auth_bloc.dart';
import 'bloc/booking_bloc.dart';
import 'bloc/cart_bloc.dart';
import 'bloc/service_bloc.dart';
import 'services/api_service.dart';
import 'repositories/auth_repository.dart';
import 'repositories/booking_repository.dart';
import 'repositories/cart_repository.dart';
import 'repositories/service_repository.dart';
import 'screens/booking_detail_screen.dart';
import 'screens/service_detail_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (context) => AuthBloc(AuthRepository())),
        BlocProvider(create: (context) => CartBloc(CartRepository())),
        BlocProvider(create: (context) => BookingBloc(BookingRepository())),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthSuccess) {
          return const HomeScreen();
        }

        if (ApiService.hasToken()) {
          return const HomeScreen();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSignup = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Please fill all fields")));
      return;
    }

    if (_isSignup) {
      context.read<AuthBloc>().add(AuthSignupRequested(email, password));
    } else {
      context.read<AuthBloc>().add(AuthLoginRequested(email, password));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("MenteCart")),
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthFailure) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: "Email",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: "Password",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, state) {
                    if (state is AuthLoading) {
                      return const ElevatedButton(
                        onPressed: null,
                        child: CircularProgressIndicator(),
                      );
                    }
                    return ElevatedButton(
                      onPressed: _submit,
                      child: Text(_isSignup ? "Sign Up" : "Login"),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => setState(() => _isSignup = !_isSignup),
                child: Text(_isSignup
                    ? "Already have account? Login"
                    : "Don't have account? Sign Up"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  late final ServiceBloc _serviceBloc;

  @override
  void initState() {
    super.initState();
    _serviceBloc = ServiceBloc(ServiceRepository())
      ..add(const ServiceRequested());
  }

  @override
  void dispose() {
    _serviceBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("MenteCart"),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              // Add logout event to AuthBloc
              context.read<AuthBloc>().add(const AuthLogoutRequested());
            },
          ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: [
          const BottomNavigationBarItem(
              icon: Icon(Icons.home), label: "Services"),
          const BottomNavigationBarItem(
              icon: Icon(Icons.shopping_cart), label: "Cart"),
          const BottomNavigationBarItem(
              icon: Icon(Icons.book), label: "Bookings"),
        ],
      ),
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0:
        return BlocProvider.value(
          value: _serviceBloc,
          child: const _ServicesView(),
        );
      case 1:
        return const _CartView();
      case 2:
        return const _BookingsView();
      default:
        return const SizedBox.shrink();
    }
  }
}

class _ServicesView extends StatefulWidget {
  const _ServicesView();

  @override
  State<_ServicesView> createState() => _ServicesViewState();
}

class _ServicesViewState extends State<_ServicesView> {
  final ServiceRepository _repo = ServiceRepository();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  List<Map<String, dynamic>> _services = [];
  int _page = 1;
  final int _limit = 10;
  bool _isLoading = false;
  bool _hasMore = true;
  String? _category;

  @override
  void initState() {
    super.initState();
    _loadPage();
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
              _scrollController.position.maxScrollExtent - 200 &&
          !_isLoading &&
          _hasMore) {
        _loadPage();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPage({bool reset = false}) async {
    if (_isLoading) return;
    setState(() => _isLoading = true);

    if (reset) {
      _page = 1;
      _services.clear();
      _hasMore = true;
    }

    try {
      final resp = await _repo.fetchServicesPage(
          page: _page,
          limit: _limit,
          search:
              _searchController.text.isEmpty ? null : _searchController.text,
          category: _category);
      final data = (resp['data'] as List).cast<Map<String, dynamic>>();
      final hasMore = resp['hasMore'] as bool? ?? (data.length == _limit);

      setState(() {
        _services.addAll(data);
        _hasMore = hasMore;
        if (_hasMore) _page += 1;
      });
    } catch (e) {
      // ignore for now; optionally show error
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _onSearchSubmitted(String _) {
    _loadPage(reset: true);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    hintText: 'Search services',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onSubmitted: _onSearchSubmitted,
                ),
              ),
              const SizedBox(width: 8),
              DropdownButton<String?>(
                value: _category,
                hint: const Text('Category'),
                items: <String?>[null]
                    .followedBy(
                        _services.map((s) => s['category'] as String?).toSet())
                    .map((c) {
                  return DropdownMenuItem<String?>(
                    value: c,
                    child: Text(c ?? 'All'),
                  );
                }).toList(),
                onChanged: (v) {
                  setState(() => _category = v);
                  _loadPage(reset: true);
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: _services.isEmpty && _isLoading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  controller: _scrollController,
                  itemCount: _services.length + (_hasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index >= _services.length) {
                      return const Padding(
                        padding: EdgeInsets.all(12.0),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }

                    final service = _services[index];
                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) =>
                                ServiceDetailScreen(service: service),
                          ),
                        );
                      },
                      child: Card(
                        margin: const EdgeInsets.all(8),
                        child: ListTile(
                          title: Text(service['title']?.toString() ??
                              'Untitled service'),
                          subtitle:
                              Text(service['description']?.toString() ?? ''),
                          trailing: Text('Rs ${service['price']}'),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _CartView extends StatefulWidget {
  const _CartView();

  @override
  State<_CartView> createState() => _CartViewState();
}

class _CartViewState extends State<_CartView> {
  String _paymentMethod = 'cash';
  bool _checkoutNavigating = false;
  final List<String> _timeSlots = const [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
  ];

  double _itemPrice(dynamic item) {
    final service = item['serviceId'];
    if (service is Map<String, dynamic>) {
      final value = service['price'];
      if (value is num) return value.toDouble();
    }
    final raw = item['price'];
    if (raw is num) return raw.toDouble();
    return 0;
  }

  String _itemTitle(dynamic item) {
    final service = item['serviceId'];
    if (service is Map<String, dynamic>) {
      return service['title']?.toString() ?? 'Service';
    }
    return 'Service';
  }

  Future<void> _editDateAndSlot({
    required String itemId,
    required int quantity,
    required String currentDate,
    required String currentSlot,
  }) async {
    DateTime selectedDate = DateTime.tryParse(currentDate) ?? DateTime.now();
    String selectedSlot = currentSlot;

    final shouldSave = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Edit Slot'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${selectedDate.year.toString().padLeft(4, '0')}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}',
                        ),
                      ),
                      TextButton(
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: selectedDate,
                            firstDate: DateTime.now(),
                            lastDate:
                                DateTime.now().add(const Duration(days: 60)),
                          );
                          if (picked != null) {
                            setDialogState(() => selectedDate = picked);
                          }
                        },
                        child: const Text('Pick Date'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _timeSlots.contains(selectedSlot)
                        ? selectedSlot
                        : _timeSlots.first,
                    decoration: const InputDecoration(labelText: 'Time Slot'),
                    items: _timeSlots
                        .map((slot) =>
                            DropdownMenuItem(value: slot, child: Text(slot)))
                        .toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setDialogState(() => selectedSlot = value);
                      }
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );

    if (shouldSave == true) {
      final dateStr =
          '${selectedDate.year.toString().padLeft(4, '0')}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
      context.read<CartBloc>().add(
            CartItemUpdated(
              itemId,
              quantity: quantity,
              date: dateStr,
              timeSlot: selectedSlot,
            ),
          );
    }
  }

  @override
  void initState() {
    super.initState();
    // Fetch cart when this view is shown
    context.read<CartBloc>().add(const CartFetchRequested());
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<BookingBloc, BookingState>(
          listener: (context, state) async {
            if (state is BookingSuccess) {
              final bookingId = state.booking['_id']?.toString() ?? '';
              if (bookingId.isNotEmpty && !_checkoutNavigating) {
                _checkoutNavigating = true;
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BookingDetailScreen(bookingId: bookingId),
                  ),
                );
                if (context.mounted) {
                  context.read<CartBloc>().add(const CartFetchRequested());
                  context.read<BookingBloc>().add(const BookingListRequested());
                }
                _checkoutNavigating = false;
              }
            }

            if (state is BookingFailure) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message.replaceFirst('Exception: ', '')),
                ),
              );
            }
          },
        ),
      ],
      child: BlocConsumer<CartBloc, CartState>(
        listener: (context, state) async {
          if (state is CartFailure &&
              state.message.startsWith('DUPLICATE_SLOT:')) {
            final itemId = state.message.split(':').last;
            final shouldRemove = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Duplicate Slot'),
                content: const Text(
                    'Another cart item already exists for this service, date and slot. Remove this item and keep the existing one?'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel')),
                  ElevatedButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Merge')),
                ],
              ),
            );

            if (shouldRemove == true) {
              context.read<CartBloc>().add(CartItemRemoved(itemId));
            } else {
              context.read<CartBloc>().add(const CartFetchRequested());
            }
            return;
          }

          if (state is CartFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message.replaceFirst('Exception: ', ''))),
            );
          }
        },
        builder: (context, state) {
          if (state is CartLoading || state is CartInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is CartFailure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => context
                          .read<CartBloc>()
                          .add(const CartFetchRequested()),
                      child: const Text("Retry"),
                    ),
                  ],
                ),
              ),
            );
          }

          if (state is CartLoaded) {
            final items = state.cart["items"] as List<dynamic>?;

            if (items == null || items.isEmpty) {
              return const Center(child: Text("Your cart is empty"));
            }

            final totalItemCount = items.fold<int>(
              0,
              (sum, item) => sum + ((item['quantity'] as int?) ?? 1),
            );
            final grandTotal = items.fold<double>(
              0,
              (sum, item) =>
                  sum + (_itemPrice(item) * ((item['quantity'] as int?) ?? 1)),
            );

            return Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final itemId = item["_id"]?.toString() ?? "";
                      final quantity = item["quantity"] as int? ?? 1;

                      return Card(
                        margin: const EdgeInsets.all(8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _itemTitle(item),
                                          style: const TextStyle(
                                              fontWeight: FontWeight.bold),
                                        ),
                                        Text(
                                          "${item["date"]} at ${item["timeSlot"]}",
                                          style: const TextStyle(
                                              fontSize: 12, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete,
                                        color: Colors.red),
                                    onPressed: () {
                                      context
                                          .read<CartBloc>()
                                          .add(CartItemRemoved(itemId));
                                    },
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove),
                                        onPressed: () {
                                          if (quantity > 1) {
                                            context.read<CartBloc>().add(
                                                  CartItemUpdated(
                                                    itemId,
                                                    quantity: quantity - 1,
                                                  ),
                                                );
                                          }
                                        },
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12),
                                        decoration:
                                            BoxDecoration(border: Border.all()),
                                        child: Text('$quantity'),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add),
                                        onPressed: () {
                                          context.read<CartBloc>().add(
                                                CartItemUpdated(
                                                  itemId,
                                                  quantity: quantity + 1,
                                                ),
                                              );
                                        },
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.edit_calendar),
                                        tooltip: 'Change date/slot',
                                        onPressed: () => _editDateAndSlot(
                                          itemId: itemId,
                                          quantity: quantity,
                                          currentDate:
                                              item['date']?.toString() ?? '',
                                          currentSlot:
                                              item['timeSlot']?.toString() ??
                                                  _timeSlots.first,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    "Rs ${(_itemPrice(item) * quantity).toStringAsFixed(0)}",
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.green),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Summary',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text('Items: $totalItemCount'),
                      Text('Total: Rs ${grandTotal.toStringAsFixed(0)}'),
                      const SizedBox(height: 8),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 140),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: items.length,
                          itemBuilder: (context, index) {
                            final item = items[index];
                            final quantity = item['quantity'] as int? ?? 1;
                            final title = _itemTitle(item);
                            final subTotal = _itemPrice(item) * quantity;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(child: Text('$title x$quantity')),
                                  Text('Rs ${subTotal.toStringAsFixed(0)}'),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      const Divider(),
                      const Text('Payment Method:',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: RadioListTile<String>(
                              value: 'cash',
                              groupValue: _paymentMethod,
                              onChanged: (value) => setState(
                                  () => _paymentMethod = value ?? 'cash'),
                              title: const Text('Cash'),
                            ),
                          ),
                          Expanded(
                            child: RadioListTile<String>(
                              value: 'card',
                              groupValue: _paymentMethod,
                              onChanged: (value) => setState(
                                  () => _paymentMethod = value ?? 'cash'),
                              title: const Text('Card'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            context.read<BookingBloc>().add(
                                  BookingCheckoutRequested(
                                      paymentMethod: _paymentMethod),
                                );
                          },
                          child: const Text("Checkout"),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }

          return const Center(child: Text("Cart error"));
        },
      ),
    );
  }
}

class _BookingsView extends StatefulWidget {
  const _BookingsView();

  @override
  State<_BookingsView> createState() => _BookingsViewState();
}

class _BookingsViewState extends State<_BookingsView> {
  @override
  void initState() {
    super.initState();
    // Fetch bookings when this view is shown
    context.read<BookingBloc>().add(const BookingListRequested());
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<BookingBloc, BookingState>(
      builder: (context, state) {
        if (state is BookingLoading || state is BookingInitial) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state is BookingFailure) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => context
                        .read<BookingBloc>()
                        .add(const BookingListRequested()),
                    child: const Text("Retry"),
                  ),
                ],
              ),
            ),
          );
        }

        if (state is BookingListLoaded) {
          final bookings = state.bookings;

          if (bookings.isEmpty) {
            return const Center(child: Text("No bookings yet"));
          }

          return ListView.builder(
            itemCount: bookings.length,
            itemBuilder: (context, index) {
              final booking = bookings[index];
              final bookingId = booking["_id"]?.toString() ?? "";
              final shortId =
                  bookingId.length >= 8 ? bookingId.substring(0, 8) : bookingId;
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  onTap: bookingId.isEmpty
                      ? null
                      : () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => BookingDetailScreen(
                                bookingId: bookingId,
                              ),
                            ),
                          );
                          if (context.mounted) {
                            context
                                .read<BookingBloc>()
                                .add(const BookingListRequested());
                          }
                        },
                  title: Text("Booking #${shortId.isEmpty ? "N/A" : shortId}"),
                  subtitle: Text(
                      "Status: ${booking["status"]}\nDate: ${booking["createdAt"]}"),
                  trailing: Text("Rs ${booking["totalPrice"]}"),
                ),
              );
            },
          );
        }

        if (state is BookingSuccess) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text("Booking Successful!",
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Text("Booking ID: ${state.booking["_id"]}"),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => context
                        .read<BookingBloc>()
                        .add(const BookingListRequested()),
                    child: const Text("View All Bookings"),
                  ),
                ],
              ),
            ),
          );
        }

        return const Center(child: Text("Bookings error"));
      },
    );
  }
}
