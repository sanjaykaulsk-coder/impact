import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../core/providers.dart';

/// Camera-only opening evidence (spec §17: "Mandatory evidence is camera-only... no gallery for
/// evidence fields") — this screen only ever offers the live camera, never a file/gallery picker.
/// GPS is captured at the moment of the shot; the actual watermark (location/time/lat-long/user)
/// is burned into the image server-side on upload (MediaStorageService), not here — this screen's
/// review step shows the same figures as plain text so the field worker can check them first.
class CameraCaptureScreen extends ConsumerStatefulWidget {
  final String activityInstanceId;
  final String campaignId;
  const CameraCaptureScreen({super.key, required this.activityInstanceId, required this.campaignId});

  @override
  ConsumerState<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends ConsumerState<CameraCaptureScreen> {
  CameraController? _controller;
  String? _error;
  XFile? _capturedFile;
  Position? _capturedPosition;
  DateTime? _capturedAt;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _error = 'No camera found on this device');
        return;
      }
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(back, ResolutionPreset.high, enableAudio: false);
      await controller.initialize();
      if (!mounted) return;
      setState(() => _controller = controller);
    } catch (e) {
      if (mounted) setState(() => _error = 'Camera unavailable: $e');
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      final file = await controller.takePicture();
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
        );
      } catch (_) {
        // GPS unavailable at shot time — still let the field worker review/retake; confirming
        // without a position is blocked below, matching the milestone's mandatoryGps intent.
      }
      if (!mounted) return;
      setState(() {
        _capturedFile = file;
        _capturedPosition = position;
        _capturedAt = DateTime.now();
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not capture photo: $e')));
    }
  }

  void _retake() {
    setState(() {
      _capturedFile = null;
      _capturedPosition = null;
      _capturedAt = null;
    });
  }

  Future<void> _confirm() async {
    final file = _capturedFile;
    final position = _capturedPosition;
    final capturedAt = _capturedAt;
    if (file == null || position == null || capturedAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location is required before this photo can be used — try again')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final dir = await getApplicationDocumentsDirectory();
      final outboxDir = Directory(p.join(dir.path, 'outbox_photos'));
      await outboxDir.create(recursive: true);
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${p.basename(file.path)}';
      final savedPath = p.join(outboxDir.path, fileName);
      await File(file.path).copy(savedPath);

      await ref.read(outboxDatabaseProvider).enqueue(
        type: 'media',
        campaignId: widget.campaignId,
        activityInstanceId: widget.activityInstanceId,
        payload: {
          'fileName': fileName,
          'mimeType': 'image/jpeg',
          'latitude': position.latitude,
          'longitude': position.longitude,
          'capturedAt': capturedAt.toIso8601String(),
        },
        filePath: savedPath,
      );
      try {
        await ref.read(syncServiceProvider).syncPending();
      } catch (_) {
        // Queued regardless — will retry on the next sync trigger.
      }
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Camera')),
        body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!))),
      );
    }

    if (_capturedFile != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Review photo')),
        body: Column(
          children: [
            Expanded(child: Image.file(File(_capturedFile!.path))),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                _capturedPosition != null
                    ? '${_capturedPosition!.latitude.toStringAsFixed(6)}, '
                        '${_capturedPosition!.longitude.toStringAsFixed(6)} — ${_capturedAt!.toLocal()}'
                    : 'Location unavailable — this photo cannot be used yet',
                textAlign: TextAlign.center,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  OutlinedButton.icon(
                    onPressed: _saving ? null : _retake,
                    icon: const Icon(Icons.replay),
                    label: const Text('Retake'),
                  ),
                  ElevatedButton.icon(
                    onPressed: _saving ? null : _confirm,
                    icon: const Icon(Icons.check),
                    label: Text(_saving ? 'Saving…' : 'Use this photo'),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Opening photo')),
      body: Column(
        children: [
          Expanded(child: CameraPreview(controller)),
          Padding(
            padding: const EdgeInsets.all(20),
            child: FloatingActionButton(onPressed: _capture, child: const Icon(Icons.camera_alt)),
          ),
        ],
      ),
    );
  }
}
