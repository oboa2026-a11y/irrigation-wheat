/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { IrrigationScheme, Language } from '../../types';
import { X, Save, Trash2, MapPin, AlertCircle, Droplets, Wrench, CheckCircle2 } from 'lucide-react';

interface SchemeEditModalProps {
  scheme: IrrigationScheme | null; // null if adding new scheme
  isOpen: boolean;
  onClose: () => void;
  onSave: (scheme: IrrigationScheme) => void;
  onDelete?: (schemeId: string) => void;
  lang: Language;
  presetCoords?: { lat: number; lng: number } | null;
}

const OROMIA_ZONES = [
  { id: 1, name: 'Arsii', nameEn: 'Arsi' },
  { id: 2, name: 'Baale', nameEn: 'Bale' },
  { id: 3, name: 'Bara Arsi Lixaa', nameEn: 'West Arsi' },
  { id: 4, name: 'Shawaa Bahaa', nameEn: 'East Shewa' },
  { id: 5, name: 'Shawaa Kibba Lixaa', nameEn: 'South West Shewa' },
  { id: 6, name: 'Shawaa Lixaa', nameEn: 'West Shewa' },
  { id: 7, name: 'Shawaa Kaabaa', nameEn: 'North Shewa' },
  { id: 8, name: 'Harargee Bahaa', nameEn: 'East Hararghe' },
  { id: 9, name: 'Harargee Lixaa', nameEn: 'West Hararghe' },
  { id: 10, name: 'Jimmaa', nameEn: 'Jimma' },
  { id: 11, name: 'Iluu Abbaa Booraa', nameEn: 'Ilubabor' },
  { id: 12, name: 'Bunnoo Beddellee', nameEn: 'Buno Bedele' },
  { id: 13, name: 'Gujii', nameEn: 'Guji' },
  { id: 14, name: 'Boorana', nameEn: 'Borena' },
];

export const SchemeEditModal: React.FC<SchemeEditModalProps> = ({
  scheme,
  isOpen,
  onClose,
  onSave,
  onDelete,
  lang,
  presetCoords,
}) => {
  const isOromo = lang === 'om';
  const isEdit = Boolean(scheme);

  const [formData, setFormData] = useState<IrrigationScheme>({
    id: '',
    name: '',
    zoneId: 4,
    zoneName: 'East Shewa',
    woreda: '',
    lat: 8.54,
    lng: 39.27,
    commandAreaHa: 1000,
    serviceableAreaHa: 900,
    actualIrrigatedWheatHa: 850,
    status: 'functional',
    waterAvailability: 'adequate',
    method: 'Furrow',
    waterSource: 'River',
    pumpsTotal: 4,
    pumpsFunctional: 4,
    operationalProblem: 'None',
    beneficiariesCount: 1200,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (scheme) {
      setFormData(scheme);
    } else {
      const newId = `SCH-${Date.now().toString().slice(-5)}`;
      setFormData({
        id: newId,
        name: '',
        zoneId: 4,
        zoneName: 'East Shewa',
        woreda: '',
        lat: presetCoords ? Number(presetCoords.lat.toFixed(4)) : 8.54,
        lng: presetCoords ? Number(presetCoords.lng.toFixed(4)) : 39.27,
        commandAreaHa: 500,
        serviceableAreaHa: 450,
        actualIrrigatedWheatHa: 400,
        status: 'functional',
        waterAvailability: 'adequate',
        method: 'Furrow',
        waterSource: 'River',
        pumpsTotal: 2,
        pumpsFunctional: 2,
        operationalProblem: 'None',
        beneficiariesCount: 650,
      });
    }
    setErrors({});
  }, [scheme, presetCoords, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errs.name = isOromo ? 'Maqaan iskimi dirqama' : 'Scheme name is required';
    }
    if (!formData.woreda.trim()) {
      errs.woreda = isOromo ? 'Aanaan dirqama' : 'Woreda is required';
    }
    if (isNaN(formData.lat) || formData.lat < 3.0 || formData.lat > 15.0) {
      errs.lat = isOromo ? 'Bal\'inni (Lat) Oromiyaa (3.0 - 15.0) gidduu ta\'uu qaba' : 'Latitude must be between 3.0 and 15.0 (Oromia/Ethiopia)';
    }
    if (isNaN(formData.lng) || formData.lng < 33.0 || formData.lng > 48.0) {
      errs.lng = isOromo ? 'Dheerinni (Lng) (33.0 - 48.0) gidduu ta\'uu qaba' : 'Longitude must be between 33.0 and 48.0';
    }
    if (formData.commandAreaHa <= 0) {
      errs.commandAreaHa = isOromo ? 'Lafichi 0 ol ta\'uu qaba' : 'Command area must be greater than 0';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
    onClose();
  };

  const handleZoneSelect = (zoneId: number) => {
    const selected = OROMIA_ZONES.find(z => z.id === zoneId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        zoneId: selected.id,
        zoneName: isOromo ? selected.name : selected.nameEn,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEdit
                  ? (isOromo ? `Iskimi Jallisii Fooyyessi: ${formData.name}` : `Edit Irrigation Scheme: ${formData.name}`)
                  : (isOromo ? 'Iskimi Jallisii Haaraa Galchi' : 'Add New Irrigation Scheme')}
              </h3>
              <p className="text-xs text-slate-500">
                {isOromo
                  ? 'Ragaa GIS, GPS, qophii lafaa fi paampootaa sirreessi'
                  : 'Manage GIS location, command area, pump status and water sources'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Row 1: Scheme Name & Scheme ID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Maqaa Iskimii *' : 'Scheme Name *'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Wonji-Shoa, Fentale, Gololcha..."
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.name ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.name && <p className="text-[10px] text-rose-500 font-medium">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Koodii Iskimii' : 'Scheme ID'}
              </label>
              <input
                type="text"
                disabled
                value={formData.id}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono"
              />
            </div>
          </div>

          {/* Row 2: Zone & Woreda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Godina *' : 'Zone *'}
              </label>
              <select
                value={formData.zoneId}
                onChange={e => handleZoneSelect(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {OROMIA_ZONES.map(z => (
                  <option key={z.id} value={z.id}>
                    {isOromo ? z.name : z.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Aanaa *' : 'Woreda *'}
              </label>
              <input
                type="text"
                required
                value={formData.woreda}
                onChange={e => setFormData({ ...formData, woreda: e.target.value })}
                placeholder="e.g. Adama, Fentale, Dodota..."
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.woreda ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.woreda && <p className="text-[10px] text-rose-500 font-medium">{errors.woreda}</p>}
            </div>
          </div>

          {/* Row 3: GPS Coordinates */}
          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {isOromo ? 'Bakka GPS (GIS Coordinates)' : 'GPS Coordinates (GIS Location)'}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                {formData.lat.toFixed(4)}° N, {formData.lng.toFixed(4)}° E
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isOromo ? 'Kaaba (Latitude)' : 'Latitude (°N)'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={formData.lat}
                  onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {errors.lat && <p className="text-[10px] text-rose-500 font-medium">{errors.lat}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isOromo ? 'Baha (Longitude)' : 'Longitude (°E)'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={formData.lng}
                  onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {errors.lng && <p className="text-[10px] text-rose-500 font-medium">{errors.lng}</p>}
              </div>
            </div>
          </div>

          {/* Row 4: Land Areas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Lafa Qabatamaa (Command ha)' : 'Command Area (ha) *'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.commandAreaHa}
                onChange={e => setFormData({ ...formData, commandAreaHa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Lafa Tajaajiluu (Serviceable ha)' : 'Serviceable Area (ha)'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.serviceableAreaHa}
                onChange={e => setFormData({ ...formData, serviceableAreaHa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Qamadii Jallisame (Wheat ha)' : 'Actual Irrigated Wheat (ha)'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.actualIrrigatedWheatHa}
                onChange={e => setFormData({ ...formData, actualIrrigatedWheatHa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Row 5: Scheme Status & Water Availability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Haala Hojii Iskimichaa (Status)' : 'Functionality Status *'}
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="functional">🟢 Functional (Hojjetaa Jira)</option>
                <option value="partly_functional">🟡 Partly Functional (Gartokkeen Hojjeta)</option>
                <option value="non_functional">🔴 Non-functional (Hojii Dhaabeera)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Dhiheessii Bishaanii' : 'Water Availability *'}
              </label>
              <select
                value={formData.waterAvailability}
                onChange={e => setFormData({ ...formData, waterAvailability: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              >
                <option value="adequate">Adequate (Gahaa)</option>
                <option value="limited">Limited (Muraasa)</option>
                <option value="unavailable">Unavailable (Hin Jiru)</option>
              </select>
            </div>
          </div>

          {/* Row 6: Method & Water Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Mala Jallisii (Method)' : 'Irrigation Method'}
              </label>
              <select
                value={formData.method}
                onChange={e => setFormData({ ...formData, method: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              >
                <option value="Furrow">Furrow</option>
                <option value="Basin">Basin</option>
                <option value="Sprinkler">Sprinkler</option>
                <option value="Drip">Drip</option>
                <option value="Flood">Flood</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Madda Bishaanii (Water Source)' : 'Water Source'}
              </label>
              <select
                value={formData.waterSource}
                onChange={e => setFormData({ ...formData, waterSource: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              >
                <option value="River">River (Laga)</option>
                <option value="Stream">Stream (Lolaa/Yaa\'a)</option>
                <option value="Spring">Spring (Burqaa)</option>
                <option value="Lake">Lake (Haroo)</option>
                <option value="Dam">Dam (Kuufama Hidhaa)</option>
                <option value="Borehole">Borehole (Bolee)</option>
                <option value="Shallow Well">Shallow Well (Ela Gad-fagoo)</option>
                <option value="Pond">Pond (Haroo Qotame)</option>
              </select>
            </div>
          </div>

          {/* Row 7: Pumps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Paampota Waliigalaa' : 'Total Pumps'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.pumpsTotal}
                onChange={e => setFormData({ ...formData, pumpsTotal: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Paampota Hojjetan' : 'Functional Pumps'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.pumpsFunctional}
                onChange={e => setFormData({ ...formData, pumpsFunctional: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isOromo ? 'Maatii Fayyadaman' : 'Beneficiaries'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.beneficiariesCount}
                onChange={e => setFormData({ ...formData, beneficiariesCount: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Row 8: Operational Problem */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isOromo ? 'Rakkoo Qabatamaa (Operational Problem)' : 'Operational Problem'}
            </label>
            <select
              value={formData.operationalProblem}
              onChange={e => setFormData({ ...formData, operationalProblem: e.target.value as any })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
            >
              <option value="None">None (Rakkoon Hin Jiru)</option>
              <option value="Pump breakdown">Pump breakdown (Paampiin Cabeera)</option>
              <option value="Canal damage">Canal damage (Boonoon Miidhameera)</option>
              <option value="Siltation">Siltation (Cirrachaan Guutame)</option>
              <option value="Water shortage">Water shortage (Bishaan Hir\'ateera)</option>
              <option value="Power cut">Power cut (Ibsaan Muraameera)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      isOromo
                        ? `Iskimi "${formData.name}" haquu barbaaddaa?`
                        : `Are you sure you want to permanently delete scheme "${formData.name}"?`
                    )
                  ) {
                    onDelete(formData.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isOromo ? 'Haqi' : 'Delete Scheme'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {isOromo ? 'Dhiisi' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isEdit ? (isOromo ? 'Goochi' : 'Save Changes') : (isOromo ? 'Iskimi Galchi' : 'Create Scheme')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
