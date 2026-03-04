import { useState, useEffect } from 'react';
import { Upload, FileText, Calendar, Tag, FolderOpen, Check, AlertCircle, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { suggestKeywords, suggestCategory } from '../lib/aiAssistant';
import type { Database } from '../lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

export default function UploadPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    documentDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    keywords: '',
    isImportant: false,
  });

  useEffect(() => {
    loadCategories();
  }, [profile]);

  useEffect(() => {
    if (formData.title.length > 3) {
      const suggestions = suggestKeywords(
        formData.title,
        formData.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      );
      setAiSuggestions(suggestions);

      const suggestedCatId = suggestCategory(
        formData.title,
        categories.map((c) => ({ id: c.id, name: c.name }))
      );
      if (suggestedCatId && !formData.categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: suggestedCatId }));
      }

      setShowAiPanel(suggestions.length > 0);
    } else {
      setAiSuggestions([]);
      setShowAiPanel(false);
    }
  }, [formData.title, categories]);

  const loadCategories = async () => {
    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('name');

    if (data) {
      setCategories(data);
      if (data.length > 0 && !formData.categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: data[0].id }));
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');

    if (!formData.title) {
      const titleFromFile = selectedFile.name.replace(/\.[^/.]+$/, '');
      setFormData((prev) => ({ ...prev, title: titleFromFile }));
    }
  };

  const addSuggestedKeyword = (keyword: string) => {
    const existing = formData.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (!existing.includes(keyword)) {
      const newKeywords = [...existing, keyword].join(', ');
      setFormData((prev) => ({ ...prev, keywords: newKeywords }));
      setAiSuggestions((prev) => prev.filter((s) => s !== keyword));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !profile?.organization_id) {
      setError('Veuillez selectionner un fichier');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.organization_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('documents').getPublicUrl(filePath);

      const keywordsArray = formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const { error: dbError } = await supabase.from('documents').insert({
        organization_id: profile.organization_id,
        title: formData.title,
        description: formData.description,
        file_url: publicUrl,
        file_type: fileExt || 'unknown',
        document_date: formData.documentDate,
        category_id: formData.categoryId || null,
        keywords: keywordsArray,
        ai_keywords: aiSuggestions,
        uploaded_by: profile.id,
        is_important: formData.isImportant,
      });

      if (dbError) throw dbError;

      await supabase.from('activity_logs').insert({
        organization_id: profile.organization_id,
        user_id: profile.id,
        action: 'document.upload',
        details: { title: formData.title },
      });

      setSuccess(true);
      setTimeout(() => {
        onNavigate('documents');
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Document Archive</h2>
          <p className="text-slate-600">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Nouveau Document</h2>
        <p className="text-slate-600">Ajoutez un document a vos archives</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            `}
          >
            {file ? (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Changer de fichier
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 mb-1">Glissez-deposez votre fichier ici</p>
                  <p className="text-sm text-slate-600">ou</p>
                </div>
                <label className="inline-block">
                  <input
                    type="file"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                  />
                  <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer inline-block transition-colors">
                    Choisir un fichier
                  </span>
                </label>
                <p className="text-xs text-slate-500">PDF, Word, Excel, Images (max 10 MB)</p>
              </div>
            )}
          </div>
        </div>

        {file && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-5">
            <h3 className="font-semibold text-slate-900">Informations du Document</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Titre du document
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Rapport annuel 2024"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description (optionnel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Decrivez brievement le contenu du document..."
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date du document
                </label>
                <input
                  type="date"
                  required
                  value={formData.documentDate}
                  onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FolderOpen className="w-4 h-4 inline mr-1" />
                  Categorie
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Mots-cles (separes par des virgules)
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="Ex: budget, finance, 2024"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {showAiPanel && aiSuggestions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">Suggestions IA</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => addSuggestedKeyword(kw)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-200 rounded-full text-sm text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {kw}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Cliquez pour ajouter un mot-cle suggere
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="important"
                checked={formData.isImportant}
                onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="important" className="text-sm font-medium text-slate-700">
                Marquer comme document important
              </label>
            </div>
          </div>
        )}

        {file && (
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
            >
              {uploading ? 'Archivage en cours...' : 'Archiver le Document'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
