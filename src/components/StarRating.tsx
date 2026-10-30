import React from 'react';
import { Star } from 'lucide-react';

export interface StarRatingProps {
  stars?: number | null;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating: React.FC<StarRatingProps> = ({
  stars = null,
  maxStars = 5,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const isAnalyzed = typeof stars === 'number' && stars > 0;
  const starCount = isAnalyzed ? Math.min(Math.max(stars, 0), maxStars) : 0;

  return (
    <div className="flex items-center space-x-0.5" aria-label={isAnalyzed ? `${starCount} of ${maxStars} stars` : 'Not analyzed'}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const isFilled = isAnalyzed && index < starCount;
        return (
          <Star
            key={index}
            className={`${sizeClasses[size]} transition-colors duration-150 ${
              isFilled
                ? 'fill-amber-400 text-amber-400'
                : 'text-stone-300 fill-transparent stroke-stone-300'
            }`}
          />
        );
      })}
    </div>
  );
};
