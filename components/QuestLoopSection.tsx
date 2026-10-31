'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';
import { PlanTask, TaskHandoff, Intent, Community, User, Language } from '@/lib/types';
import { CheckCircle2, Circle, ArrowRight, UserCheck, Shield, Plus, UploadCloud, FileText } from 'lucide-react';

interface QuestLoopSectionProps {
  tasks: PlanTask[];
  handoffs: TaskHandoff[];
  intents: Intent[];
  community: Community;
  currentUser: User;
  users: User[];
  lang: Language;
  onRefresh: () => void;
}

export const QuestLoopSection: React.FC<QuestLoopSectionProps> = ({
  tasks,
  handoffs,
  intents,
  community,
  currentUser,
  users,
  lang,
  onRefresh
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'tasks' | 'handoffs' | 'intents'>('tasks');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id || null);

  // Evidence submission state
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');

  // Handoff form state
  const [isCreatingHandoff, setIsCreatingHandoff] = useState(false);
  const [handoffNextOwner, setHandoffNextOwner] = useState(users[1]?.id || 'usr_alex');
  const [handoffNotes, setHandoffNotes] = useState('');

  // Intent form state
  const [isDeclaringIntent, setIsDeclaringIntent] = useState(false);
  const [intentType, setIntentType] = useState<Intent['intentType']>('volunteer');
  const [intentTitle, setIntentTitle] = useState('');

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const handleToggleChecklist = async (taskId: string, checklistId: string, completed: boolean) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_checklist',
          payload: { taskId, checklistId, completed }
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update checklist:', err);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !evidenceUrl.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_task',
          payload: {
            taskId: selectedTaskId,
            evidenceUrl,
            description: evidenceDesc,
            memberId: currentUser.id
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsSubmittingEvidence(false);
        setEvidenceUrl('');
        setEvidenceDesc('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to submit evidence:', err);
    }
  };

  const handleCreateHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_handoff',
          payload: {
            communityId: community.id,
            taskId: selectedTaskId,
            previousOwnerId: currentUser.id,
            nextOwnerId: handoffNextOwner,
            contextNotes: handoffNotes,
            transferredEvidence: []
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreatingHandoff(false);
        setHandoffNotes('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to create handoff:', err);
    }
  };

  const handleAcceptHandoff = async (handoffId: string) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_handoff',
          payload: { handoffId }
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to accept handoff:', err);
    }
  };

  const handleDeclareIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intentTitle.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'declare_intent',
          payload: {
            communityId: community.id,
            memberId: currentUser.id,
            intentType,
            targetTitle: intentTitle,
            targetId: `target_${Date.now()}`
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsDeclaringIntent(false);
        setIntentTitle('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to declare intent:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subnav: Tasks vs MoveSure Handoffs vs IntentReady */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-2 transition-colors ${
              activeTab === 'tasks' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            QuestLoop Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('handoffs')}
            className={`pb-2 transition-colors ${
              activeTab === 'handoffs' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            MoveSure Handoffs ({handoffs.length})
          </button>
          <button
            onClick={() => setActiveTab('intents')}
            className={`pb-2 transition-colors ${
              activeTab === 'intents' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            IntentReady ({intents.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Tasks View */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Task list (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
                {t.common.empty}
              </div>
            ) : (
              tasks.map((task) => {
                const isSelected = task.id === selectedTaskId;
                const completedCount = task.checklist.filter((c) => c.completed).length;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-1">
                        {task.title}
                      </h3>
                      <span
                        className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded ${
                          task.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            : task.status === 'in_progress'
                            ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                      <span>Assignee: {task.assigneeId || 'Unassigned'}</span>
                      <span className="font-mono text-indigo-400">
                        {completedCount}/{task.checklist.length} Milestones
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Task Detail & Checklist & Evidence (7 Cols) */}
          <div className="lg:col-span-7">
            {selectedTask ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-6">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">
                      {selectedTask.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedTask.rewardRecognition && (
                        <span className="text-[11px] font-mono text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                          <Shield className="h-3 w-3 text-amber-400" />
                          <span>{selectedTask.rewardRecognition}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                    {selectedTask.description}
                  </p>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-300 block mb-0.5">Expected Output:</span>
                      <span className="text-slate-400">{selectedTask.expectedOutput}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300 block mb-0.5">Acceptance Criteria:</span>
                      <span className="text-slate-400">{selectedTask.acceptanceCriteria}</span>
                    </div>
                  </div>
                </div>

                {/* Milestones Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Milestone Execution Checklist
                  </h4>
                  <div className="space-y-2">
                    {selectedTask.checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklist(selectedTask.id, item.id, !item.completed)}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 cursor-pointer hover:border-slate-700 transition-colors"
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-500 shrink-0" />
                        )}
                        <span className={`text-xs ${item.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {item.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions: MoveSure Handoff or Submit Evidence */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setIsCreatingHandoff(!isCreatingHandoff)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Initiate MoveSure Handoff</span>
                  </button>

                  {selectedTask.status !== 'completed' && (
                    <button
                      onClick={() => setIsSubmittingEvidence(!isSubmittingEvidence)}
                      className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Submit Deliverable with Evidence</span>
                    </button>
                  )}
                </div>

                {/* Evidence Submission Drawer */}
                {isSubmittingEvidence && (
                  <form onSubmit={handleSubmitEvidence} className="rounded-lg border border-indigo-700/60 bg-indigo-950/20 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Submit Verifiable Evidence (SourceTrail)</span>
                    </h5>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        Verifiable Evidence URL (PR, Document, or Audit Report)
                      </label>
                      <input
                        type="url"
                        required
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                        placeholder="https://github.com/.../commit or https://docs..."
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        Completion Notes
                      </label>
                      <textarea
                        rows={2}
                        value={evidenceDesc}
                        onChange={(e) => setEvidenceDesc(e.target.value)}
                        placeholder="Detail the work done against acceptance criteria..."
                        className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSubmittingEvidence(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        Submit to Contribution Ledger
                      </button>
                    </div>
                  </form>
                )}

                {/* MoveSure Handoff Drawer */}
                {isCreatingHandoff && (
                  <form onSubmit={handleCreateHandoff} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-white">
                      MoveSure — Structured Task Ownership Transfer
                    </h5>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        Transfer Responsibility To
                      </label>
                      <select
                        value={handoffNextOwner}
                        onChange={(e) => setHandoffNextOwner(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.passport.displayName})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        Context & Handoff Notes
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={handoffNotes}
                        onChange={(e) => setHandoffNotes(e.target.value)}
                        placeholder="Explain context, progress so far, and next steps..."
                        className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingHandoff(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Dispatch Handoff Request
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-12 text-center text-xs text-slate-400">
                Select a task to review deliverables and milestones.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: MoveSure Handoffs List */}
      {activeTab === 'handoffs' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            MoveSure prevents lost context when tasks change hands between contributors.
          </p>
          {handoffs.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center text-xs text-slate-400">
              No task handoffs recorded.
            </div>
          ) : (
            handoffs.map((h) => {
              const prevUser = users.find((u) => u.id === h.previousOwnerId);
              const nextUser = users.find((u) => u.id === h.nextOwnerId);
              return (
                <div key={h.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <span>{prevUser?.name || h.previousOwnerId}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{nextUser?.name || h.nextOwnerId}</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        h.accepted ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {h.accepted ? 'Accepted' : 'Pending Signoff'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {h.contextNotes}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Task: {h.taskId}</span>
                    {!h.accepted && (
                      <button
                        onClick={() => handleAcceptHandoff(h.id)}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <UserCheck className="h-3 w-3" />
                        <span>Accept Handoff</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: IntentReady */}
      {activeTab === 'intents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              IntentReady captures intentions to volunteer, attend, or help, turning sentiment into accountability.
            </p>
            <button
              onClick={() => setIsDeclaringIntent(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Declare Intent</span>
            </button>
          </div>

          {isDeclaringIntent && (
            <form onSubmit={handleDeclareIntent} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
              <h5 className="text-xs font-bold text-white">
                Declare Meaningful Intent to Action
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Intent Type</label>
                  <select
                    value={intentType}
                    onChange={(e) => setIntentType(e.target.value as any)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white capitalize"
                  >
                    <option value="volunteer">Volunteer for Initiative</option>
                    <option value="attend_event">Attend Event</option>
                    <option value="help_request">Help with Request</option>
                    <option value="join_challenge">Join QuestLoop Challenge</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Target Name</label>
                  <input
                    type="text"
                    required
                    value={intentTitle}
                    onChange={(e) => setIntentTitle(e.target.value)}
                    placeholder="e.g. Arabic Documentation Audit"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeclaringIntent(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Confirm Intent
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {intents.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize font-mono text-indigo-400">{item.intentType.replace('_', ' ')}</span>
                  <span className="capitalize text-emerald-400">{item.status}</span>
                </div>
                <h4 className="text-sm font-semibold text-white">
                  {item.targetTitle}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Declared by {item.memberId} on {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
