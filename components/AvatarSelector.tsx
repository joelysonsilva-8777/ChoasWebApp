'use client';

import React, { useState } from 'react';
import {
  AvatarComponents,
  getHairOptions,
  AVATAR_BODIES,
  AVATAR_HATS,
  AVATAR_HATS_NONE,
  AVATAR_ACCESSORIES,
  AVATAR_CLOTHING,
  getAvatarSuggestions,
  DEFAULT_AVATAR,
} from '@/lib/avatarService';
import AvatarDisplay from './AvatarDisplay';
import { ChevronDown, Zap } from 'lucide-react';

interface AvatarSelectorProps {
  value: AvatarComponents;
  onChange: (avatar: AvatarComponents) => void;
  onClose?: () => void;
  showSuggestions?: boolean;
}

type SelectorTab = 'suggestions' | 'customize';
type HairFilter = 'all' | 'female' | 'male';

export default function AvatarSelector({
  value,
  onChange,
  onClose,
  showSuggestions = true,
}: AvatarSelectorProps) {
  const [activeTab, setActiveTab] = useState<SelectorTab>(showSuggestions ? 'suggestions' : 'customize');
  const [genderFilter, setGenderFilter] = useState<HairFilter>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>('body');

  const hairOptions = getHairOptions().filter((opt) => {
    if (genderFilter === 'female') return opt.value.startsWith('Female_');
    if (genderFilter === 'male') return opt.value.startsWith('Male_');
    return true;
  });

  const suggestions = getAvatarSuggestions();

  const ColoredSection = ({
    title,
    icon,
    color,
    isOpen,
    onToggle,
  }: {
    title: string;
    icon: string;
    color: string;
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm`}>
            {icon}
          </div>
          <span className="font-semibold text-slate-900">{title}</span>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );

  return (
    <div className="bg-slate-50 rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 flex">
        {showSuggestions && (
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 px-6 py-4 font-semibold transition border-b-2 ${
              activeTab === 'suggestions'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Zap className="inline mr-2 -mt-1" size={16} />
            Sugestões
          </button>
        )}
        <button
          onClick={() => setActiveTab('customize')}
          className={`flex-1 px-6 py-4 font-semibold transition border-b-2 ${
            activeTab === 'customize'
              ? 'text-blue-600 border-blue-600 bg-blue-50'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Personalizador
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Options */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'suggestions' ? (
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600 mb-4">Escolha um avatar pronto ou personalize do seu jeito:</p>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onChange(suggestion);
                    setActiveTab('customize');
                  }}
                  className="w-full p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:shadow-md transition flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <AvatarDisplay avatar={suggestion} size="md" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Sugestão {idx + 1}</p>
                    <p className="text-xs text-slate-500">Clique para customizar</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white">
              {/* Body Selection */}
              <ColoredSection
                title="Tom de Pele"
                icon="🎨"
                color="from-amber-500 to-orange-500"
                isOpen={expandedSection === 'body'}
                onToggle={() => setExpandedSection(expandedSection === 'body' ? null : 'body')}
              />
              {expandedSection === 'body' && (
                <div className="px-6 py-4 bg-slate-50 flex flex-wrap gap-2">
                  {AVATAR_BODIES.map((body) => (
                    <button
                      key={body.value}
                      onClick={() => onChange({ ...value, body: body.value })}
                      className={`px-4 py-2 rounded-lg border-2 transition font-medium ${
                        value.body === body.value
                          ? 'border-blue-600 bg-blue-100 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {body.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Hair Selection */}
              <ColoredSection
                title="Cabelos"
                icon="💇"
                color="from-amber-400 to-amber-600"
                isOpen={expandedSection === 'hair'}
                onToggle={() => setExpandedSection(expandedSection === 'hair' ? null : 'hair')}
              />
              {expandedSection === 'hair' && (
                <div className="px-6 py-4 bg-slate-50 space-y-3">
                  <div className="flex gap-1 mb-3">
                    {[
                      { value: 'all' as HairFilter, label: 'Todos', icon: '👥' },
                      { value: 'female' as HairFilter, label: 'Feminino', icon: '👩' },
                      { value: 'male' as HairFilter, label: 'Masculino', icon: '👨' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setGenderFilter(opt.value)}
                        className={`flex-1 text-sm px-3 py-2 rounded-lg border-2 transition font-medium ${
                          genderFilter === opt.value
                            ? 'border-blue-600 bg-blue-100 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    {hairOptions.map((hair) => (
                      <button
                        key={hair.value}
                        onClick={() => onChange({ ...value, hair: hair.value })}
                        className={`px-3 py-2 text-xs rounded-lg border-2 transition font-medium ${
                          value.hair === hair.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                        title={hair.label}
                      >
                        {hair.label.split(' - ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hat Selection */}
              <ColoredSection
                title="Chapéu"
                icon="🎩"
                color="from-purple-500 to-purple-600"
                isOpen={expandedSection === 'hat'}
                onToggle={() => setExpandedSection(expandedSection === 'hat' ? null : 'hat')}
              />
              {expandedSection === 'hat' && (
                <div className="px-6 py-4 bg-slate-50 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onChange({ ...value, hat: '' })}
                    className={`px-3 py-2 rounded-lg border-2 transition text-sm font-medium ${
                      value.hat === ''
                        ? 'border-blue-600 bg-blue-100 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {AVATAR_HATS_NONE.label}
                  </button>
                  {AVATAR_HATS.map((hat) => (
                    <button
                      key={hat.value}
                      onClick={() => onChange({ ...value, hat: hat.value })}
                      className={`px-3 py-2 rounded-lg border-2 transition text-sm font-medium ${
                        value.hat === hat.value
                          ? 'border-blue-600 bg-blue-100 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                      title={hat.label}
                    >
                      {hat.label.split(' ')[1]}
                    </button>
                  ))}
                </div>
              )}

              {/* Accessory Selection */}
              <ColoredSection
                title="Acessório"
                icon="✨"
                color="from-pink-500 to-rose-500"
                isOpen={expandedSection === 'accessory'}
                onToggle={() => setExpandedSection(expandedSection === 'accessory' ? null : 'accessory')}
              />
              {expandedSection === 'accessory' && (
                <div className="px-6 py-4 bg-slate-50 grid grid-cols-4 gap-2">
                  {AVATAR_ACCESSORIES.map((acc) => (
                    <button
                      key={acc.value}
                      onClick={() => onChange({ ...value, accessory: acc.value })}
                      className={`px-3 py-2 rounded-lg border-2 transition text-sm font-medium ${
                        value.accessory === acc.value
                          ? 'border-blue-600 bg-blue-100 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {acc.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}

              {/* Clothing Selection */}
              <ColoredSection
                title="Roupa"
                icon="👕"
                color="from-blue-500 to-cyan-500"
                isOpen={expandedSection === 'clothing'}
                onToggle={() => setExpandedSection(expandedSection === 'clothing' ? null : 'clothing')}
              />
              {expandedSection === 'clothing' && (
                <div className="px-6 py-4 bg-slate-50 grid grid-cols-2 gap-2">
                  {AVATAR_CLOTHING.map((clothing) => (
                    <button
                      key={clothing.value}
                      onClick={() => onChange({ ...value, clothing: clothing.value })}
                      className={`px-4 py-2 rounded-lg border-2 transition text-sm font-medium ${
                        value.clothing === clothing.value
                          ? 'border-blue-600 bg-blue-100 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {clothing.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="w-48 bg-white border-l border-slate-200 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-3 font-semibold">SEU AVATAR</p>
            <div className="w-32 h-32 rounded-2xl overflow-hidden mb-4 shadow-lg">
              <AvatarDisplay avatar={value} size="xl" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2">
            <button
              onClick={() => onChange(DEFAULT_AVATAR)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:border-slate-400 transition text-sm"
            >
              Resetar
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg transition text-sm"
              >
                ✨ Pronto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
