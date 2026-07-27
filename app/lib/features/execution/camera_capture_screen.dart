import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../core/location/get_current_position.dart';
import '../../core/providers.dart';
import '../../l10n/app_localizations.dart';

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
  String? _positionError;
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
        setState(() => _error = AppLocalizations.of(context)!.noCameraFound);
        return;
      }
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      // .medium (~720p) rather than .high: plenty sharp for evidence review, noticeably faster to
      // capture and upload on real hardware — .high was visibly laggy on real-device testing and
      // made the upload slow enough to matter.
      final controller = CameraController(back, ResolutionPreset.medium, enableAudio: false);
      await controller.initialize();
      if (!mounted) return;
      setState(() => _controller = controller);
    } catch (e) {
      if (mounted) setState(() => _error = AppLocalizations.of(context)!.cameraUnavailable('$e'));
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      final file = await controller.takePicture();
      Position? position;
      String? positionError;
      try {
        position = await getCurrentPositionOrThrow();
      } catch (e) {
        // GPS unavailable at shot time — still let the field worker review/retake; confirming
        // without a position is blocked below, matching the milestone's mandatoryGps intent. The
        // actual reason (permission denied, services off, etc.) is shown on the review screen
        // rather than swallowed, since a silent generic message left no way to tell what to fix.
        positionError = e.toString().replaceFirst('Exception: ', '');
      }
      if (!mounted) return;
      setState(() {
        _capturedFile = file;
        _capturedPosition = position;
        _positionError = positionError;
        _capturedAt = DateTime.now();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.couldNotCapturePhoto('$e'))),
        );
      }
    }
  }

  void _retake() {
    setState(() {
      _capturedFile = null;
      _capturedPosition = null;
      _positionError = null;
      _capturedAt = null;
    });
  }

  Future<void> _confirm() async {
    final file = _capturedFile;
    final position = _capturedPosition;
    final capturedAt = _capturedAt;
    if (file == null || position == null || capturedAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.locationRequiredRetry)),
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
        await ref.read(syncServiceProvider).syncPending(force: true);
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
    final t = AppLocalizations.of(context)!;
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: Text(t.cameraTitle)),
        body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!))),
      );
    }

    if (_capturedFile != null) {
      return Scaffold(
        appBar: AppBar(title: Text(t.reviewPhotoTitle)),
        body: Column(
          children: [
            Expanded(child: Image.file(File(_capturedFile!.path))),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                _capturedPosition != null
                    ? '${_capturedPosition!.latitude.toStringAsFixed(6)}, '
                        '${_capturedPosition!.longitude.toStringAsFixed(6)} — ${_capturedAt!.toLocal()}'
                    : t.cannotBeUsedRetake(_positionError ?? t.locationUnavailable),
                textAlign: TextAlign.center,
                style: _capturedPosition == null ? const TextStyle(color: Colors.red) : null,
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
                    label: Text(t.retake),
                  ),
                  ElevatedButton.icon(
                    onPressed: _saving ? null : _confirm,
                    icon: const Icon(Icons.check),
                    label: Text(_saving ? t.savingPhoto : t.useThisPhoto),
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
      appBar: AppBar(title: Text(t.openingPhotoTitle)),
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
