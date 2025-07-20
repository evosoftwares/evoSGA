
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, TeamMember, Project, Tag as TagType } from '@/types/database';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: () => void;
  teamMembers: TeamMember[];
  projects: Project[];
  tags: TagType[];
  taskTags: { task_id: string; tag_id: string }[];
  columns: { id: string; title: string }[];
  commentCounts: Record<string, number>;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index, 
  onClick, 
  teamMembers, 
  projects, 
  tags, 
  taskTags,
  columns,
  commentCounts
}) => {
  // Encontrar o nome do responsável
  const assignee = teamMembers.find(member => member.id === task.assignee);
  const assigneeName = assignee ? assignee.name : null;

  // Encontrar o projeto associado
  const project = projects.find(p => p.id === task.project_id);

  // Encontrar as tags da tarefa
  const taskTagIds = taskTags.filter(tt => tt.task_id === task.id).map(tt => tt.tag_id);
  const taskTagList = tags.filter(tag => taskTagIds.includes(tag.id));

  // Verificar se a tarefa está na coluna "Concluído"
  const currentColumn = columns.find(col => col.id === task.column_id);
  const isCompleted = currentColumn?.title?.toLowerCase().includes('concluído') || 
                     currentColumn?.title?.toLowerCase().includes('concluido') ||
                     currentColumn?.title?.toLowerCase().includes('completed') ||
                     currentColumn?.title?.toLowerCase().includes('done');

  // Get comment count for this task
  const commentCount = commentCounts[task.id] || 0;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isCompleted}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg border border-gray-200 p-3 mb-2 cursor-pointer 
            transition-all duration-150
            hover:border-gray-300 hover:shadow-sm
            ${snapshot.isDragging ? 'shadow-lg scale-105' : ''} 
            ${isCompleted ? 'opacity-60 bg-gray-50' : ''}`}
          onClick={onClick}
        >
          {/* Header com título, complexidade e pontos */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-2 flex-1">
              <h3 className={`text-sm font-medium ${
                isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}>
                {task.title}
              </h3>
              {/* Bolinha da complexidade */}
              {task.complexity && (
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  task.complexity === 'low' ? 'bg-green-500' :
                  task.complexity === 'medium' ? 'bg-yellow-500' :
                  task.complexity === 'high' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} title={
                  task.complexity === 'low' ? 'Baixa complexidade' :
                  task.complexity === 'medium' ? 'Média complexidade' :
                  task.complexity === 'high' ? 'Alta complexidade' :
                  'Complexidade indefinida'
                }></div>
              )}
            </div>
            {/* Pill azul para pontos de função */}
            {task.function_points > 0 && (
              <div className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full">
                {task.function_points}
              </div>
            )}
          </div>

          {/* Descrição resumida */}
          {task.description && (
            <p className={`text-xs mb-2 line-clamp-1 ${
              isCompleted ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {task.description}
            </p>
          )}

          {/* Tags */}
          {taskTagList.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {taskTagList.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 h-5 font-medium rounded-full"
                  style={{ backgroundColor: tag.color + '15', color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
              {taskTagList.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 rounded-full">
                  ...
                </Badge>
              )}
            </div>
          )}

          {/* Footer com métricas e responsável */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              {/* Horas */}
              {task.estimated_hours && (
                <span>{task.estimated_hours}h</span>
              )}
              
              {/* Comentários */}
              {commentCount > 0 && (
                <span>{commentCount} 💬</span>
              )}
            </div>

            {/* Responsável */}
            {assigneeName && (
              <span className="font-medium truncate max-w-20">
                {assigneeName}
              </span>
            )}
          </div>

          {/* Status concluído */}
          {isCompleted && (
            <div className="mt-2 text-xs text-green-600 font-medium">
              ✓ Concluída
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
