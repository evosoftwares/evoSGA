import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FileTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface TagBadgeProps {
  tag: FileTag;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: (tagId: string) => void;
  onClick?: (tag: FileTag) => void;
  className?: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  variant = 'default',
  size = 'sm',
  removable = false,
  onRemove,
  onClick,
  className = ''
}) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(tag.id);
  };

  const handleClick = () => {
    onClick?.(tag);
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 h-5',
    md: 'text-sm px-2.5 py-1 h-6',
    lg: 'text-sm px-3 py-1.5 h-7'
  };

  const bgOpacity = variant === 'outline' ? '20' : '80';
  const textColor = variant === 'outline' ? tag.color : '#ffffff';
  const borderColor = variant === 'outline' ? tag.color : 'transparent';
  
  return (
    <Badge
      variant={variant}
      className={`
        ${sizeClasses[size]}
        inline-flex items-center gap-1.5 font-medium cursor-pointer
        transition-all duration-200 hover:scale-105
        ${className}
      `}
      style={{
        backgroundColor: variant === 'outline' ? `${tag.color}${bgOpacity}` : tag.color,
        color: textColor,
        borderColor: borderColor,
        borderWidth: variant === 'outline' ? '1px' : '0'
      }}
      onClick={handleClick}
      title={tag.description || tag.name}
    >
      <span className="truncate max-w-24">
        {tag.name}
      </span>
      
      {removable && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-3 w-3 p-0 hover:bg-white/20"
          onClick={handleRemove}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      )}
    </Badge>
  );
};

export default TagBadge;