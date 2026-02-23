
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface UsersProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  currentUser: User | null;
}

const Users: React.FC<UsersProps> = ({ users, onAddUser, onUpdateUser, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'operator' as UserRole,
    status: 'active' as 'active' | 'inactive'
  });

  // PROTECCIÓN DE RUTA: Solo administradores
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-700">
        <div className="size-28 bg-rose-50 rounded-[3rem] flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10 mb-8 border border-rose-100">
          <span className="material-symbols-outlined text-6xl filled">admin_panel_settings</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Módulo Restringido</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] max-w-xs leading-relaxed">
          Se requiere nivel de acceso <span className="text-rose-500">Administrador</span> para gestionar las cuentas del sistema.
        </p>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    // Aplicar mayúsculas automáticamente a campos de texto
    const formattedValue = (field === 'name' || field === 'username') ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '', 
      role: user.role,
      status: user.status
    });
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', password: '', role: 'operator', status: 'active' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) return;
    if (!editingUser && !formData.password) {
      alert("La contraseña es obligatoria para nuevos registros.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        await onUpdateUser({
          ...editingUser,
          name: formData.name,
          username: formData.username,
          role: formData.role,
          status: formData.status,
          ...(formData.password ? { password: formData.password } : {})
        });
      } else {
        await onAddUser(formData);
      }
      setShowModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Error al procesar el usuario en la base de datos.");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'admin': return 'ADMINISTRADOR';
      case 'operator': return 'OPERADOR';
      case 'viewer': return 'OBSERVADOR';
      default: return role.toUpperCase();
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Usuarios</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Administración de credenciales y niveles de seguridad del sistema</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all uppercase tracking-widest"
        >
          <span className="material-symbols-outlined">person_add</span>
          Nuevo Operador
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuentas activas en Google Sheets</p>
          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">
            {users.length} Usuarios
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 text-slate-500 border-b border-slate-100">
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest">Personal</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest">ID de Acceso</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest">Rol</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest">Último Acceso</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-[15px] tracking-tight">{user.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className={`size-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                             {user.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                           </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <code className="text-[11px] font-black text-primary bg-blue-50 px-2 py-1 rounded-lg">@{user.username}</code>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                      user.role === 'operator' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-xs font-bold text-slate-400">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-ES') : 'Nunca ha ingresado'}
                    </p>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="size-10 text-slate-300 hover:text-primary hover:bg-white hover:shadow-md rounded-xl transition-all flex items-center justify-center ml-auto"
                    >
                      <span className="material-symbols-outlined text-xl">edit_square</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-12 py-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{editingUser ? 'Actualizar Cuenta' : 'Registrar Nuevo Acceso'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración de credenciales de seguridad</p>
              </div>
              <button onClick={() => !isSaving && setShowModal(false)} className="size-12 rounded-full hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-12 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo (Personal)</label>
                <input 
                  required disabled={isSaving} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase" 
                  placeholder="NOMBRE DEL EMPLEADO"
                  value={formData.name} 
                  onChange={e => handleInputChange('name', e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID Usuario (@)</label>
                  <input 
                    required disabled={isSaving} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase" 
                    placeholder="USUARIO"
                    value={formData.username} 
                    onChange={e => handleInputChange('username', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                  <input 
                    type="password"
                    disabled={isSaving} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all" 
                    placeholder={editingUser ? "Omitir para no cambiar" : "••••••••"}
                    value={formData.password} 
                    onChange={e => handleInputChange('password', e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permisos</label>
                  <select 
                    required disabled={isSaving} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none appearance-none" 
                    value={formData.role} 
                    onChange={e => handleInputChange('role', e.target.value)}
                  >
                    <option value="operator">OPERADOR (CAPTURA)</option>
                    <option value="viewer">OBSERVADOR (LECTURA)</option>
                    <option value="admin">ADMINISTRADOR (TOTAL)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                  <select 
                    required disabled={isSaving} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none appearance-none" 
                    value={formData.status} 
                    onChange={e => handleInputChange('status', e.target.value)}
                  >
                    <option value="active">ACTIVO / VIGENTE</option>
                    <option value="inactive">BLOQUEADO / INACTIVO</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" disabled={isSaving} 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={isSaving} 
                  className="flex-[2] py-4 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-500/20 hover:opacity-95 flex items-center justify-center gap-3 transition-all"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      Sincronizando...
                    </>
                  ) : (
                    editingUser ? 'Guardar Cambios' : 'Registrar Cuenta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
