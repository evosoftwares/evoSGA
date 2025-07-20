import React from 'react';
import { ChevronRight, Home, FolderOpen } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItem {
  id: string;
  name: string;
  path: string;
  type: 'root' | 'folder' | 'current';
}

interface FileBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
}

const FileBreadcrumb: React.FC<FileBreadcrumbProps> = ({ items, onNavigate }) => {
  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage className="flex items-center gap-2">
                  {item.type === 'root' ? (
                    <Home className="w-4 h-4" />
                  ) : (
                    <FolderOpen className="w-4 h-4" />
                  )}
                  {item.name}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink 
                  onClick={() => onNavigate(item.path)}
                  className="flex items-center gap-2 cursor-pointer hover:text-blue-600"
                >
                  {item.type === 'root' ? (
                    <Home className="w-4 h-4" />
                  ) : (
                    <FolderOpen className="w-4 h-4" />
                  )}
                  {item.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && (
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default FileBreadcrumb;