import React, { useState } from 'react';
import { Plus, X, Save, ClipboardCheck, Info } from 'lucide-react';

interface MRDConfigProps {
  fields: string[];
  onSave: (fields: string[]) => void;
  isSaving: boolean;
}

export const MRDConfig: React.FC<MRDConfigProps> = ({ fields, onSave, isSaving }) => {
  const [localFields, setLocalFields] = useState<string[]>(fields);
  const [newField, setNewField] = useState('');

  const handleAddField = () => {
    if (newField.trim() && !localFields.includes(newField.trim())) {
      setLocalFields([...localFields, newField.trim()]);
      setNewField('');
    }
  };

  const handleRemoveField = (index: number) => {
    setLocalFields(localFields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(localFields);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">MRD Compliance Checklist</h3>
            <p className="text-sm text-slate-500">Customize the fields the AI should audit for every clinical record.</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 leading-relaxed">
            Adding specific fields here will instruct the AI to check for their presence and legibility in the uploaded documents. 
            Common fields include <strong>Patient ID</strong>, <strong>Doctor Signature</strong>, and <strong>Date of Admission</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddField()}
              placeholder="Add a new checklist field (e.g., Nurse Initials)"
              className="flex-1 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
            <button
              onClick={handleAddField}
              disabled={!newField.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {localFields.map((field, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group hover:border-indigo-200 hover:bg-white transition-all"
              >
                <span className="text-sm font-medium text-slate-700">{field}</span>
                <button
                  onClick={() => handleRemoveField(index)}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {localFields.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-sm text-slate-400">No custom fields added yet. The system will use default fields.</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
};
