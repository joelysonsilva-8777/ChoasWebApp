"use client";

import React, { useState } from 'react';
import { AvatarComponents, getAvatarLayerPath } from '@/lib/avatarService';

interface AvatarDisplayProps {
  avatar: AvatarComponents;
  size?: 'sm' | 'md' | 'lg' | 'xl'; // sm=40px, md=80px, lg=132px, xl=220px
  className?: string;
  fallback?: string; // Fallback letter or text
  imageSrc?: string;
  imageAlt?: string;
}

export default function AvatarDisplay({
  avatar,
  size = 'md',
  className = '',
  fallback,
  imageSrc,
  imageAlt,
}: AvatarDisplayProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-56 h-56',
  };

  const layers = getAvatarLayerPath(
    avatar.body,
    avatar.hair,
    avatar.hat,
    avatar.accessory,
    avatar.clothing
  );

  const allLayers = [
    { src: layers.personagem, label: 'body' },
    { src: layers.cabelos, label: 'hair' },
    { src: layers.chapeu, label: 'hat' },
    { src: layers.acessorio, label: 'accessory' },
    { src: layers.roupa, label: 'clothing' },
  ].filter((l) => l.src);

  const handleImageError = (label: string) => {
    console.warn(`Failed to load avatar layer: ${label}`);
  };

  return (
    <div
      className={`relative ${sizeMap[size]} rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {imageSrc && !imageFailed ? (
        <img
          src={imageSrc}
          alt={imageAlt || 'Foto de perfil'}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {allLayers.length > 0 ? (
            <div className="relative w-full h-full">
              {allLayers.map((layer, idx) => (
                <img
                  key={idx}
                  src={layer.src}
                  alt={`avatar-layer-${layer.label}`}
                  className="absolute inset-0 w-full h-full object-contain"
                  loading="lazy"
                  onError={() => handleImageError(layer.label)}
                  style={{ imageRendering: 'crisp-edges' }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center">
              <span className="text-lg font-bold text-slate-600">
                {fallback || '?'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
