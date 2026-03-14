// src/components/UserList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUsers, addUser, removeUser, updateUserOrder } from '@/app/actions/users';
import type { User } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ user, onDelete }: { user: User; onDelete: (id: number, name: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-move hover:bg-muted">
      <span className="text-sm">{user.name}</span>
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(user.id, user.name); }} className="h-6 w-6 p-0 text-red-500">
        ×
      </Button>
    </div>
  );
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleAdd() {
    if (!newName.trim()) return;
    const user = await addUser(newName.trim());
    setUsers([...users, user]);
    setNewName('');
  }

  async function handleDelete(id: number, name: string) {
    await removeUser(id, name);
    setUsers(users.filter(u => u.id !== id));
  }

  async function handleDragEnd(event: { active: any; over: any }) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = users.findIndex(u => u.id === active.id);
      const newIndex = users.findIndex(u => u.id === over.id);
      const newUsers = arrayMove(users, oldIndex, newIndex);
      setUsers(newUsers);
      await updateUserOrder(newUsers.map(u => u.id));
    }
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={users.map(u => u.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {users.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm">
                添加第一位值班人员
              </div>
            ) : (
              users.map(user => (
                <SortableItem key={user.id} user={user} onDelete={handleDelete} />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <Input
          placeholder="添加人员"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="h-8"
        />
        <Button size="sm" onClick={handleAdd} className="h-8">添加</Button>
      </div>
    </div>
  );
}
