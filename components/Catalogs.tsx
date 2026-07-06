import React, { useMemo, useState } from 'react';
import { MaintenanceType, Supplier } from '../types';
import { SortableTh, useSortableData } from '../utils/tableSort';

interface CatalogsProps {
  maintenanceTypes: MaintenanceType[];
  suppliers: Supplier[];
  searchQuery?: string;
  onAddMaintenanceType: (name: string) => Promise<void>;
  onUpdateMaintenanceType: (type: MaintenanceType) => Promise<void>;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  onUpdateSupplier: (supplier: Supplier) => Promise<void>;
}

const emptySupplierForm = { name: '', contact: '', phone: '', email: '', address: '', notes: '' };

const Catalogs: React.FC<CatalogsProps> = ({
  maintenanceTypes,
  suppliers,
  searchQuery = '',
  onAddMaintenanceType,
  onUpdateMaintenanceType,
  onAddSupplier,
  onUpdateSupplier
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'suppliers'>('services');
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingService, setEditingService] = useState<MaintenanceType | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredServices = useMemo(() => {
    if (!normalizedQuery) return maintenanceTypes;
    return maintenanceTypes.filter(type => String(type.name || '').toLowerCase().includes(normalizedQuery));
  }, [maintenanceTypes, normalizedQuery]);
  const filteredSuppliers = useMemo(() => {
    if (!normalizedQuery) return suppliers;
    return suppliers.filter(supplier => [
      supplier.name,
      supplier.contact,
      supplier.phone,
      supplier.email,
      supplier.address,
      supplier.notes
    ].some(value => String(value || '').toLowerCase().includes(normalizedQuery)));
  }, [suppliers, normalizedQuery]);

  type ServiceSortKey = 'name';
  type SupplierSortKey = 'name' | 'contact' | 'phone' | 'email';
  const serviceSortAccessors = useMemo<Record<ServiceSortKey, (type: MaintenanceType) => unknown>>(() => ({
    name: type => type.name
  }), []);
  const supplierSortAccessors = useMemo<Record<SupplierSortKey, (supplier: Supplier) => unknown>>(() => ({
    name: supplier => supplier.name,
    contact: supplier => supplier.contact || '',
    phone: supplier => supplier.phone || '',
    email: supplier => supplier.email || ''
  }), []);

  const { sortedItems: sortedServices, sortConfig: serviceSortConfig, requestSort: requestServiceSort } =
    useSortableData(filteredServices, serviceSortAccessors, { key: 'name', direction: 'asc' });
  const { sortedItems: sortedSuppliers, sortConfig: supplierSortConfig, requestSort: requestSupplierSort } =
    useSortableData(filteredSuppliers, supplierSortAccessors, { key: 'name', direction: 'asc' });

  const openNewService = () => {
    setFormError('');
    setEditingService(null);
    setServiceName('');
    setServiceModalOpen(true);
  };

  const openEditService = (type: MaintenanceType) => {
    setFormError('');
    setEditingService(type);
    setServiceName(type.name || '');
    setServiceModalOpen(true);
  };

  const openNewSupplier = () => {
    setFormError('');
    setEditingSupplier(null);
    setSupplierForm(emptySupplierForm);
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (supplier: Supplier) => {
    setFormError('');
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setSupplierModalOpen(true);
  };

  const closeModals = () => {
    if (isSaving) return;
    setFormError('');
    setServiceModalOpen(false);
    setSupplierModalOpen(false);
    setEditingService(null);
    setEditingSupplier(null);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!serviceName.trim()) return;
    setIsSaving(true);
    try {
      if (editingService) {
        await onUpdateMaintenanceType({ ...editingService, name: serviceName.trim() });
      } else {
        await onAddMaintenanceType(serviceName.trim());
      }
      setServiceModalOpen(false);
      setEditingService(null);
      setServiceName('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el tipo de servicio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!supplierForm.name.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        name: supplierForm.name.trim(),
        contact: supplierForm.contact.trim(),
        phone: supplierForm.phone.trim(),
        email: supplierForm.email.trim(),
        address: supplierForm.address.trim(),
        notes: supplierForm.notes.trim()
      };
      if (editingSupplier) {
        await onUpdateSupplier({ ...editingSupplier, ...payload });
      } else {
        await onAddSupplier(payload);
      }
      setSupplierModalOpen(false);
      setEditingSupplier(null);
      setSupplierForm(emptySupplierForm);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el proveedor.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSupplierField = (field: keyof typeof emptySupplierForm, value: string) => {
    const formatted = field === 'email' ? value.trim().toLowerCase() : value.toUpperCase();
    setSupplierForm(prev => ({ ...prev, [field]: formatted }));
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
      <div className="page-header">
        <div>
          <h2 className="page-title">Catálogos</h2>
          <p className="page-subtitle">Administración de tipos de servicio y proveedores</p>
        </div>
        <button onClick={activeTab === 'services' ? openNewService : openNewSupplier} className="btn btn-primary">
          <span className="material-symbols-outlined ui-icon">{activeTab === 'services' ? 'playlist_add' : 'add_business'}</span>
          {activeTab === 'services' ? 'Nuevo Tipo' : 'Nuevo Proveedor'}
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1">
        <TabButton active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon="handyman" label="Tipos de servicio" />
        <TabButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} icon="storefront" label="Proveedores" />
      </div>

      {activeTab === 'services' ? (
        <CatalogCard count={sortedServices.length} label="Tipos de servicio">
          <table className="table-professional table-density-compact">
            <thead>
              <tr>
                <SortableTh label="Tipo de servicio" sortKey="name" sortConfig={serviceSortConfig} onSort={requestServiceSort} />
                <th className="text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedServices.map(type => (
                <tr key={type.id} className="hover:bg-surface-subtle/80 transition-all">
                  <td className="font-black text-text text-sm">{type.name}</td>
                  <td className="text-right">
                    <button onClick={() => openEditService(type)} className="btn-icon btn-icon-primary ml-auto" aria-label="Editar tipo de servicio">
                      <span className="material-symbols-outlined ui-icon">edit_square</span>
                    </button>
                  </td>
                </tr>
              ))}
              {sortedServices.length === 0 && <EmptyRow colSpan={2} />}
            </tbody>
          </table>
        </CatalogCard>
      ) : (
        <CatalogCard count={sortedSuppliers.length} label="Proveedores">
          <table className="table-professional table-density-compact">
            <thead>
              <tr>
                <SortableTh label="Proveedor" sortKey="name" sortConfig={supplierSortConfig} onSort={requestSupplierSort} />
                <SortableTh label="Contacto" sortKey="contact" sortConfig={supplierSortConfig} onSort={requestSupplierSort} />
                <SortableTh label="Teléfono" sortKey="phone" sortConfig={supplierSortConfig} onSort={requestSupplierSort} />
                <SortableTh label="Correo" sortKey="email" sortConfig={supplierSortConfig} onSort={requestSupplierSort} />
                <th>Dirección</th>
                <th className="text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSuppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-surface-subtle/80 transition-all">
                  <td className="font-black text-text text-sm">{supplier.name}</td>
                  <td className="font-bold text-text text-xs">{supplier.contact || '---'}</td>
                  <td className="font-bold text-text-muted text-xs">{supplier.phone || '---'}</td>
                  <td className="font-bold text-text-muted text-xs lowercase">{supplier.email || '---'}</td>
                  <td className="text-xs text-text-muted max-w-xs truncate">{supplier.address || '---'}</td>
                  <td className="text-right">
                    <button onClick={() => openEditSupplier(supplier)} className="btn-icon btn-icon-primary ml-auto" aria-label="Editar proveedor">
                      <span className="material-symbols-outlined ui-icon">edit_square</span>
                    </button>
                  </td>
                </tr>
              ))}
              {sortedSuppliers.length === 0 && <EmptyRow colSpan={6} />}
            </tbody>
          </table>
        </CatalogCard>
      )}

      {serviceModalOpen && (
        <Modal title={editingService ? 'Actualizar Tipo' : 'Registrar Tipo'} onClose={closeModals}>
          <form onSubmit={handleServiceSubmit} className="p-8 space-y-6">
            <InputField label="Tipo de servicio" required value={serviceName} onChange={value => setServiceName(value.toUpperCase())} placeholder="NOMBRE DEL SERVICIO" disabled={isSaving} />
            <ModalActions isSaving={isSaving} isEditing={Boolean(editingService)} onCancel={closeModals} error={formError} />
          </form>
        </Modal>
      )}

      {supplierModalOpen && (
        <Modal title={editingSupplier ? 'Actualizar Proveedor' : 'Registrar Proveedor'} onClose={closeModals}>
          <form onSubmit={handleSupplierSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputField label="Proveedor" required value={supplierForm.name} onChange={value => updateSupplierField('name', value)} placeholder="NOMBRE COMERCIAL" disabled={isSaving} />
              <InputField label="Contacto" value={supplierForm.contact} onChange={value => updateSupplierField('contact', value)} placeholder="ENCARGADO" disabled={isSaving} />
              <InputField label="Teléfono" value={supplierForm.phone} onChange={value => updateSupplierField('phone', value)} placeholder="TELEFONO" disabled={isSaving} />
              <InputField label="Correo" type="email" value={supplierForm.email} onChange={value => updateSupplierField('email', value)} placeholder="correo@dominio.com" disabled={isSaving} />
            </div>
            <InputField label="Dirección" value={supplierForm.address} onChange={value => updateSupplierField('address', value)} placeholder="DIRECCION" disabled={isSaving} />
            <div className="space-y-2">
              <label className="form-label">Notas</label>
              <textarea disabled={isSaving} className="form-input min-h-[100px] resize-y uppercase" value={supplierForm.notes} onChange={e => updateSupplierField('notes', e.target.value)} placeholder="OBSERVACIONES" />
            </div>
            <ModalActions isSaving={isSaving} isEditing={Boolean(editingSupplier)} onCancel={closeModals} error={formError} />
          </form>
        </Modal>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors ${active ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
    <span className="material-symbols-outlined ui-icon text-lg">{icon}</span>
    {label}
  </button>
);

const CatalogCard: React.FC<{ count: number; label: string; children: React.ReactNode }> = ({ count, label, children }) => (
  <div className="card overflow-hidden">
    <div className="px-4 py-3 border-b border-border bg-surface-subtle/50 flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Catálogo sincronizado con Google Sheets</p>
      <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[11px] font-medium">{count} {label}</span>
    </div>
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
    <div className="bg-surface rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="px-8 py-6 border-b border-border bg-surface-subtle/50 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-text tracking-tight">{title}</h3>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">Datos del catálogo</p>
        </div>
        <button onClick={onClose} className="size-10 rounded-full hover:bg-surface hover:shadow-md transition-all flex items-center justify-center text-text-muted" aria-label="Cerrar">
          <span className="material-symbols-outlined ui-icon text-2xl" aria-hidden="true">close</span>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const InputField: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; disabled?: boolean }> = ({ label, value, onChange, placeholder, type = 'text', required = false, disabled = false }) => (
  <div className="space-y-2">
    <label className="form-label">{label}</label>
    <input required={required} disabled={disabled} type={type} className={`form-input ${type === 'email' ? 'lowercase' : 'uppercase'}`} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const ModalActions: React.FC<{ isSaving: boolean; isEditing: boolean; onCancel: () => void; error: string }> = ({ isSaving, isEditing, onCancel, error }) => (
  <>
    {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">{error}</p>}
    <div className="pt-2 flex gap-4">
      <button type="button" disabled={isSaving} onClick={onCancel} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-text-muted hover:text-text transition-all">Cancelar</button>
      <button type="submit" disabled={isSaving} className="flex-[2] py-3 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:opacity-95 flex items-center justify-center gap-3 transition-all">
        {isSaving ? <><span className="material-symbols-outlined ui-icon animate-spin">sync</span>Guardando...</> : (isEditing ? 'Guardar Cambios' : 'Registrar')}
      </button>
    </div>
  </>
);

const EmptyRow: React.FC<{ colSpan: number }> = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="py-12 text-center text-sm font-bold text-text-muted">No hay registros para mostrar.</td>
  </tr>
);

export default Catalogs;
