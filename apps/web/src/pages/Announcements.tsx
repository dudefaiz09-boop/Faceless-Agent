import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Send, X, AlertCircle, Calendar, Eye, Clock } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useAnnouncements } from '@educonnect/shared-api';
import { announcementsService } from '../lib/api-client';

export const AnnouncementsPage = () => {
  const { isAdmin, isTeacher, user, schoolId } = useAuth();
  const {
    data: announcements = [],
    isLoading: loading,
    createAnnouncement,
    isCreating: submitting,
    deleteAnnouncement,
  } = useAnnouncements(announcementsService, schoolId);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetClassesInput, setTargetClassesInput] = useState('all');
  const [targetRolesInput, setTargetRolesInput] = useState('all');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      const targetClasses = targetClassesInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      const targetRoles = targetRolesInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');

      await createAnnouncement({
        title,
        content,
        targetClasses: targetClasses.length > 0 ? targetClasses : ['all'],
        targetRoles: targetRoles.length > 0 ? targetRoles : ['all'],
        isScheduled,
        scheduledFor: isScheduled ? new Date(scheduledFor).toISOString() : undefined,
        visibility: targetClasses.includes('all') ? 'school' : 'class',
        priority: 'normal',
      });
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      setTargetClassesInput('all');
      setTargetRolesInput('all');
      setIsScheduled(false);
      setScheduledFor('');
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Announcements"
        description="Stay updated with the latest news and updates."
      >
        {(isAdmin || isTeacher) && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            New Post
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-20 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
            <AlertCircle size={32} />
          </div>
          <p className="text-lg font-medium text-slate-600">No announcements yet.</p>
          <p className="text-slate-400 text-sm max-w-xs">
            When announcements are posted, they will appear here for everyone to see.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {announcements.map((ann, i) => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {ann.title}
                          </h2>
                          {ann.isScheduled && (
                            <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1">
                              <Clock size={10} /> Scheduled
                            </span>
                          )}
                          {ann.targetClasses && (
                            <div className="flex gap-1">
                              {ann.targetClasses.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {ann.authorName} •{' '}
                          {new Date((ann as any).createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'long',
                          })}
                          {ann.isScheduled &&
                            ann.scheduledFor &&
                            ` (Publishes ${new Date(ann.scheduledFor).toLocaleString()})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(isAdmin || isTeacher) && (
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors mr-2"
                          >
                            <Eye size={14} />
                            {ann.views?.length || 0} Views
                          </button>
                        )}
                        {(isAdmin || ann.authorId === user?.uid) && (
                          <button
                            onClick={() => handleDelete(ann.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 bg-blue-600 text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">New Announcement</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-6">
                <Input
                  label="Title"
                  autoFocus
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a catchy title..."
                />

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Content
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Provide the details here. You can use markdown."
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all resize-none placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Target Classes"
                      value={targetClassesInput}
                      onChange={(e) => setTargetClassesInput(e.target.value)}
                      placeholder="all, 10A, 9B"
                    />
                  </div>
                  <div>
                    <Input
                      label="Target Roles"
                      value={targetRolesInput}
                      onChange={(e) => setTargetRolesInput(e.target.value)}
                      placeholder="all, student, parent"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Calendar size={16} /> Schedule for later
                    </span>
                  </label>

                  {isScheduled && (
                    <Input
                      type="datetime-local"
                      label="Publish Date & Time"
                      required={isScheduled}
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                    />
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  isLoading={submitting}
                  className="w-full py-4"
                >
                  <Send size={20} />
                  {isScheduled ? 'Schedule Announcement' : 'Post Announcement'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
