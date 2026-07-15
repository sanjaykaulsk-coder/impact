import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/providers.dart';
import 'execution_models.dart';

/// Core field types (matching the web admin's builder — see A-024): text/number/date/choice
/// types render real inputs; PHOTO/GPS aren't used by this milestone's form and are shown as an
/// informational note rather than crashing if a future admin-configured form adds them.
class MilestoneFormScreen extends ConsumerStatefulWidget {
  final String activityInstanceId;
  final String campaignId;
  final Milestone milestone;
  const MilestoneFormScreen({
    super.key,
    required this.activityInstanceId,
    required this.campaignId,
    required this.milestone,
  });

  @override
  ConsumerState<MilestoneFormScreen> createState() => _MilestoneFormScreenState();
}

class _MilestoneFormScreenState extends ConsumerState<MilestoneFormScreen> {
  final Map<String, dynamic> _values = {};
  bool _submitting = false;
  String? _error;

  bool _isVisible(FormQuestion question) {
    final rules = widget.milestone.formVersion?.conditionalRules ?? const [];
    final targeting = rules.where((r) => r.targetQuestionId == question.id);
    if (targeting.isEmpty) return true;
    for (final rule in targeting) {
      final triggerValue = _values[rule.triggerQuestionId];
      final matches = triggerValue == rule.triggerValueJson;
      if (rule.action == 'SHOW') return matches;
      if (rule.action == 'HIDE') return !matches;
    }
    return true;
  }

  Future<void> _submit() async {
    final sections = widget.milestone.formVersion?.sections ?? const [];
    final visibleQuestions = sections.expand((s) => s.questions).where(_isVisible).toList();

    final missing = visibleQuestions.where((q) => q.isMandatory && _values[q.id] == null).toList();
    if (missing.isNotEmpty) {
      setState(() => _error = 'Please answer: ${missing.map((q) => q.label).join(', ')}');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final deviceId = await ref.read(tokenStoreProvider).serverDeviceId;
      final fieldResponses = visibleQuestions
          .where((q) => _values[q.id] != null)
          .map((q) => {'formQuestionId': q.id, 'valueJson': _values[q.id]})
          .toList();

      await ref.read(outboxDatabaseProvider).enqueue(
        type: 'milestoneResponse',
        campaignId: widget.campaignId,
        activityInstanceId: widget.activityInstanceId,
        payload: {
          'clientRef': const Uuid().v4(),
          'deviceId': ?deviceId,
          'fieldResponses': fieldResponses,
        },
      );
      try {
        await ref.read(syncServiceProvider).syncPending(force: true);
      } catch (_) {
        // Queued regardless — will retry on the next sync trigger.
      }
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sections = widget.milestone.formVersion?.sections ?? const [];
    return Scaffold(
      appBar: AppBar(title: Text(widget.milestone.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          for (final section in sections) ...[
            Text(section.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final question in section.questions.where(_isVisible)) _QuestionField(
              question: question,
              value: _values[question.id],
              onChanged: (v) => setState(() => _values[question.id] = v),
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting ? const CircularProgressIndicator() : const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

class _QuestionField extends StatefulWidget {
  final FormQuestion question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  const _QuestionField({required this.question, required this.value, required this.onChanged});

  @override
  State<_QuestionField> createState() => _QuestionFieldState();
}

class _QuestionFieldState extends State<_QuestionField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value?.toString() ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _label => widget.question.isMandatory ? '${widget.question.label} *' : widget.question.label;

  @override
  Widget build(BuildContext context) {
    switch (widget.question.fieldType) {
      case 'SHORT_TEXT':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _controller,
            decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
            onChanged: widget.onChanged,
          ),
        );
      case 'LONG_TEXT':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _controller,
            maxLines: 3,
            decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
            onChanged: widget.onChanged,
          ),
        );
      case 'INTEGER':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _controller,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
            onChanged: (v) => widget.onChanged(int.tryParse(v)),
          ),
        );
      case 'DECIMAL':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _controller,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
            onChanged: (v) => widget.onChanged(double.tryParse(v)),
          ),
        );
      case 'DATE':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: InputDecorator(
            decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
            child: InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2100),
                );
                if (picked != null) {
                  final iso = picked.toIso8601String().substring(0, 10);
                  setState(() => _controller.text = iso);
                  widget.onChanged(iso);
                }
              },
              child: Text(_controller.text.isEmpty ? 'Select a date' : _controller.text),
            ),
          ),
        );
      case 'DROPDOWN':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: DropdownButtonFormField<String>(
            initialValue: widget.value as String?,
            decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
            items: widget.question.options
                .map((o) => DropdownMenuItem(value: o.value, child: Text(o.label)))
                .toList(),
            onChanged: widget.onChanged,
          ),
        );
      case 'RADIO':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_label, style: Theme.of(context).textTheme.bodyMedium),
              RadioGroup<String>(
                groupValue: widget.value as String?,
                onChanged: widget.onChanged,
                child: Column(
                  children: [
                    for (final option in widget.question.options)
                      RadioListTile<String>(title: Text(option.label), value: option.value),
                  ],
                ),
              ),
            ],
          ),
        );
      case 'YES_NO':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: SwitchListTile(
            title: Text(_label),
            value: widget.value == true,
            onChanged: widget.onChanged,
          ),
        );
      case 'PHOTO':
      case 'GPS':
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            '$_label — captured separately as opening evidence, not inline in this form.',
            style: TextStyle(color: Colors.grey.shade600, fontStyle: FontStyle.italic),
          ),
        );
      default:
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text('$_label — unsupported field type (${widget.question.fieldType}) in this build'),
        );
    }
  }
}
