import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'bloc/service_bloc.dart';
import 'repositories/service_repository.dart';

void main() {
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: HomeScreen(),
  ));
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
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
    return BlocProvider.value(
      value: _serviceBloc,
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("MenteCart")),
      body: BlocBuilder<ServiceBloc, ServiceState>(
        builder: (context, state) {
          if (state is ServiceLoading || state is ServiceInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ServiceFailure) {
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
                          .read<ServiceBloc>()
                          .add(const ServiceRequested()),
                      child: const Text("Retry"),
                    ),
                  ],
                ),
              ),
            );
          }

          final services = (state as ServiceLoaded).services;

          if (services.isEmpty) {
            return const Center(child: Text("No services available"));
          }

          return ListView.builder(
            itemCount: services.length,
            itemBuilder: (context, index) {
              final service = services[index];

              return Card(
                child: ListTile(
                  title:
                      Text(service["title"]?.toString() ?? "Untitled service"),
                  subtitle: Text(service["description"]?.toString() ?? ""),
                  trailing: Text("Rs ${service["price"]}"),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
