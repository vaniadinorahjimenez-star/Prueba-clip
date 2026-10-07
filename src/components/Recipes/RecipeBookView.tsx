import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Lock, 
  Unlock, 
  Search, 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Printer, 
  Plus, 
  Flame, 
  Clock, 
  Scale, 
  Check, 
  Trash2, 
  Edit3, 
  X, 
  Layers, 
  Sparkles, 
  ChevronRight, 
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Calculator,
  Percent
} from 'lucide-react';
import { 
  BakeryRecipe, 
  SANTA_FE_RECIPES, 
  RecipeIngredient, 
  getRecipeBaseKg 
} from '../../data/recipesData';

const RECIPES_PASSWORD = '13579';
const STORAGE_KEY_PHOTOS = 'santafe_recipe_photos';
const STORAGE_KEY_CUSTOM_RECIPES = 'santafe_custom_recipes';
const STORAGE_KEY_TARGET_KILOS = 'santafe_recipe_target_kilos';
const STORAGE_KEY_CUSTOM_BASE_KG = 'santafe_recipe_custom_base_kg';
const SESSION_UNLOCKED_KEY = 'santafe_recipes_session_unlocked';

interface ScaledIngredientResult {
  name: string;
  originalAmount: number | string;
  originalUnit?: string;
  scaledDisplay: string;
  scaledUnitDisplay: string;
  detailedNote?: string;
  bakerPercentage?: string;
  group?: string;
  notes?: string;
}

export const RecipeBookView: React.FC = () => {
  // Password Security State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [showPinText, setShowPinText] = useState<boolean>(false);

  // Photos State: Record<recipeId, base64 or url>
  const [recipePhotos, setRecipePhotos] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PHOTOS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Custom added recipes
  const [customRecipes, setCustomRecipes] = useState<BakeryRecipe[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_RECIPES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Target Kilos per Recipe: Record<recipeId, number>
  const [targetKilosMap, setTargetKilosMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TARGET_KILOS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Custom Base Kilos per Recipe (if user wants to customize what the base is): Record<recipeId, number>
  const [customBaseKgMap, setCustomBaseKgMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_BASE_KG);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Combined recipes list
  const allRecipes = useMemo(() => {
    return [...SANTA_FE_RECIPES, ...customRecipes];
  }, [customRecipes]);

  // Filters & Selection
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(() => {
    return SANTA_FE_RECIPES[0]?.id || '';
  });
  const [viewMode, setViewMode] = useState<'sheet' | 'grid'>('sheet'); // 'sheet' is full detailed workshop format

  // Modal for editing/adding photo
  const [photoModalRecipe, setPhotoModalRecipe] = useState<BakeryRecipe | null>(null);
  const [customPhotoUrlInput, setCustomPhotoUrlInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal for editing base kg
  const [isEditingBaseKgModal, setIsEditingBaseKgModal] = useState<boolean>(false);
  const [editBaseKgInput, setEditBaseKgInput] = useState<string>('');

  // Modal for creating/editing recipe
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<BakeryRecipe> | null>(null);

  // Persist photos
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(recipePhotos));
  }, [recipePhotos]);

  // Persist custom recipes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTOM_RECIPES, JSON.stringify(customRecipes));
  }, [customRecipes]);

  // Persist target kilos
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TARGET_KILOS, JSON.stringify(targetKilosMap));
  }, [targetKilosMap]);

  // Persist custom base kilos
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTOM_BASE_KG, JSON.stringify(customBaseKgMap));
  }, [customBaseKgMap]);

  // PIN validation handler
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === RECIPES_PASSWORD) {
      setIsUnlocked(true);
      setPinError(false);
      setPinInput('');
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 10) {
      const next = pinInput + val;
      setPinInput(next);
      if (next === RECIPES_PASSWORD) {
        setIsUnlocked(true);
        setPinError(false);
        setPinInput('');
        sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      }
    }
  };

  const handleLockBook = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    setPinInput('');
  };

  // Photo handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, recipeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setRecipePhotos(prev => ({
          ...prev,
          [recipeId]: base64
        }));
        setPhotoModalRecipe(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhotoUrl = (recipeId: string) => {
    if (customPhotoUrlInput.trim()) {
      setRecipePhotos(prev => ({
        ...prev,
        [recipeId]: customPhotoUrlInput.trim()
      }));
      setCustomPhotoUrlInput('');
      setPhotoModalRecipe(null);
    }
  };

  const handleRemovePhoto = (recipeId: string) => {
    setRecipePhotos(prev => {
      const updated = { ...prev };
      delete updated[recipeId];
      return updated;
    });
    setPhotoModalRecipe(null);
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allRecipes.forEach(r => cats.add(r.category));
    return ['Todas', ...Array.from(cats)];
  }, [allRecipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return allRecipes.filter(r => {
      const matchCat = selectedCategory === 'Todas' || r.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchCat;

      const matchName = r.name.toLowerCase().includes(query);
      const matchSubtitle = (r.subtitle || '').toLowerCase().includes(query);
      const matchIngredients = r.ingredients.some(ing => ing.name.toLowerCase().includes(query));
      return matchCat && (matchName || matchSubtitle || matchIngredients);
    });
  }, [allRecipes, selectedCategory, searchQuery]);

  // Selected recipe object
  const activeRecipe = useMemo(() => {
    return allRecipes.find(r => r.id === selectedRecipeId) || filteredRecipes[0] || allRecipes[0];
  }, [allRecipes, selectedRecipeId, filteredRecipes]);

  // Base KG for active recipe (from user custom or recipe default)
  const activeBaseKg = useMemo(() => {
    if (!activeRecipe) return 1;
    if (customBaseKgMap[activeRecipe.id] && customBaseKgMap[activeRecipe.id] > 0) {
      return customBaseKgMap[activeRecipe.id];
    }
    return getRecipeBaseKg(activeRecipe);
  }, [activeRecipe, customBaseKgMap]);

  // Target KG for active recipe (what the baker wants to produce today)
  const activeTargetKg = useMemo(() => {
    if (!activeRecipe) return 1;
    if (targetKilosMap[activeRecipe.id] !== undefined && targetKilosMap[activeRecipe.id] > 0) {
      return targetKilosMap[activeRecipe.id];
    }
    return activeBaseKg;
  }, [activeRecipe, targetKilosMap, activeBaseKg]);

  // Scaling Factor
  const scaleRatio = useMemo(() => {
    if (activeBaseKg <= 0) return 1;
    return activeTargetKg / activeBaseKg;
  }, [activeTargetKg, activeBaseKg]);

  // Set target kilos handler
  const handleSetTargetKg = (kilos: number) => {
    if (!activeRecipe) return;
    const clean = Math.max(0.1, Number(kilos.toFixed(2)));
    setTargetKilosMap(prev => ({
      ...prev,
      [activeRecipe.id]: clean
    }));
  };

  // Set custom base kilos handler
  const handleSaveCustomBaseKg = () => {
    if (!activeRecipe) return;
    const parsed = parseFloat(editBaseKgInput);
    if (!isNaN(parsed) && parsed > 0) {
      setCustomBaseKgMap(prev => ({
        ...prev,
        [activeRecipe.id]: Number(parsed.toFixed(2))
      }));
      // Also sync target to new base if target was equal to old base
      if (activeTargetKg === activeBaseKg) {
        setTargetKilosMap(prev => ({
          ...prev,
          [activeRecipe.id]: Number(parsed.toFixed(2))
        }));
      }
      setIsEditingBaseKgModal(false);
    }
  };

  // Helper for scaling and formatting each ingredient cleanly
  const formatIngredient = (
    ing: RecipeIngredient,
    multiplier: number,
    baseKg: number
  ): ScaledIngredientResult => {
    if (typeof ing.amount !== 'number') {
      return {
        name: ing.name,
        originalAmount: ing.amount,
        originalUnit: ing.unit,
        scaledDisplay: String(ing.amount),
        scaledUnitDisplay: ing.unit || '',
        group: ing.group,
        notes: ing.notes
      };
    }

    const rawScaled = ing.amount * multiplier;
    const u = (ing.unit || '').toLowerCase().trim();

    // Baker percentage (% Panadero) relative to base flour/mass
    let bakerPercentage: string | undefined = undefined;
    if (baseKg > 0) {
      let ingWeightKg = 0;
      if (u === 'kg') ingWeightKg = ing.amount;
      else if (u === 'grs' || u === 'g') ingWeightKg = ing.amount / 1000;
      else if (u === 'lts' || u === 'lt') ingWeightKg = ing.amount;
      else if (u === 'ml') ingWeightKg = ing.amount / 1000;

      if (ingWeightKg > 0) {
        const pct = (ingWeightKg / baseKg) * 100;
        bakerPercentage = pct >= 1 ? `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%` : `${pct.toFixed(2)}%`;
      }
    }

    // 1. KILOS (kg)
    if (u === 'kg') {
      if (rawScaled < 1) {
        const grs = Math.round(rawScaled * 1000);
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${rawScaled.toFixed(2).replace(/\.00$/, '')} kg`,
          scaledUnitDisplay: 'kg',
          detailedNote: `${grs.toLocaleString()} grs`,
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      } else {
        const isInt = Number.isInteger(rawScaled);
        const strVal = isInt ? `${rawScaled}` : `${rawScaled.toFixed(2).replace(/\.00$/, '')}`;
        const grs = Math.round(rawScaled * 1000);
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${strVal} kg`,
          scaledUnitDisplay: 'kg',
          detailedNote: !isInt ? `${grs.toLocaleString()} grs` : undefined,
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      }
    }

    // 2. GRAMOS (grs / g)
    if (u === 'grs' || u === 'g') {
      if (rawScaled >= 1000) {
        const kgVal = (rawScaled / 1000).toFixed(2).replace(/\.00$/, '');
        const grsVal = Number.isInteger(rawScaled) ? rawScaled : rawScaled.toFixed(1);
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${Number(grsVal).toLocaleString()} grs`,
          scaledUnitDisplay: 'grs',
          detailedNote: `${kgVal} kg`,
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      } else {
        const isInt = Number.isInteger(rawScaled);
        const strVal = isInt ? `${rawScaled}` : `${rawScaled.toFixed(1).replace(/\.0$/, '')}`;
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${strVal} grs`,
          scaledUnitDisplay: 'grs',
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      }
    }

    // 3. LITROS (lts / lt)
    if (u === 'lts' || u === 'lt') {
      if (rawScaled < 1) {
        const mlVal = Math.round(rawScaled * 1000);
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${rawScaled.toFixed(2).replace(/\.00$/, '')} lts`,
          scaledUnitDisplay: 'lts',
          detailedNote: `${mlVal.toLocaleString()} ml`,
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      } else {
        const isInt = Number.isInteger(rawScaled);
        const strVal = isInt ? `${rawScaled}` : `${rawScaled.toFixed(2).replace(/\.00$/, '')}`;
        const mlVal = Math.round(rawScaled * 1000);
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${strVal} lts`,
          scaledUnitDisplay: 'lts',
          detailedNote: !isInt ? `${mlVal.toLocaleString()} ml` : undefined,
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      }
    }

    // 4. MILILITROS (ml)
    if (u === 'ml') {
      if (rawScaled >= 1000) {
        const ltVal = (rawScaled / 1000).toFixed(2).replace(/\.00$/, '');
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${Math.round(rawScaled).toLocaleString()} ml`,
          scaledUnitDisplay: 'ml',
          detailedNote: `${ltVal} lts`,
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      } else {
        return {
          name: ing.name,
          originalAmount: ing.amount,
          originalUnit: ing.unit,
          scaledDisplay: `${Math.round(rawScaled)} ml`,
          scaledUnitDisplay: 'ml',
          bakerPercentage,
          group: ing.group,
          notes: ing.notes
        };
      }
    }

    // 5. PIEZAS (huevos, etc.)
    if (u === 'piezas' || u === 'pzas' || u === 'pieza' || u === 'pza') {
      const isInt = Number.isInteger(rawScaled);
      const strVal = isInt ? `${rawScaled}` : `${rawScaled.toFixed(1)}`;
      return {
        name: ing.name,
        originalAmount: ing.amount,
        originalUnit: ing.unit,
        scaledDisplay: `${strVal} pzas`,
        scaledUnitDisplay: 'pzas',
        bakerPercentage,
        group: ing.group,
        notes: ing.notes
      };
    }

    // Fallback general
    const isInt = Number.isInteger(rawScaled);
    const strVal = isInt ? `${rawScaled}` : `${rawScaled.toFixed(2).replace(/\.00$/, '')}`;
    return {
      name: ing.name,
      originalAmount: ing.amount,
      originalUnit: ing.unit,
      scaledDisplay: `${strVal} ${ing.unit || ''}`.trim(),
      scaledUnitDisplay: ing.unit || '',
      bakerPercentage,
      group: ing.group,
      notes: ing.notes
    };
  };

  // Calculate scaled pieces / tray estimate
  const estimatedYield = useMemo(() => {
    if (!activeRecipe) return '';
    // If it's Bolillo: 8 kg base gives ~100 bolillos (12.5 bolillos per kg of flour)
    if (activeRecipe.id === 'rec-bolillo') {
      const pieces = Math.round(activeTargetKg * 12.5);
      const trays = Math.ceil(pieces / 12);
      return `~${pieces} bolillos (~${trays} charolas de 12 piezas estándar)`;
    }

    // If it has yieldDesc with numbers, scale proportionately
    if (activeRecipe.yieldDesc) {
      const numMatch = activeRecipe.yieldDesc.match(/(\d+)/);
      if (numMatch && numMatch[1]) {
        const baseNum = parseInt(numMatch[1], 10);
        const scaledNum = Math.round(baseNum * scaleRatio);
        return `~${scaledNum} piezas calculadas (${activeTargetKg} kg de masa)`;
      }
      return `${activeRecipe.yieldDesc} (x${scaleRatio.toFixed(2)})`;
    }

    return `Tanda calculada para ${activeTargetKg} kg`;
  }, [activeRecipe, activeTargetKg, scaleRatio]);

  const handlePrintCurrentRecipe = () => {
    window.print();
  };

  // If locked, render PIN screen
  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className={`w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 transition-all ${
          pinError ? 'border-red-500 shadow-red-200 animate-shake' : 'border-[#E5E1DA]'
        }`}>
          {/* Lock Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FFF5F0] border-2 border-[#D95D39]/30 flex items-center justify-center text-[#D95D39] shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[#D95D39] bg-[#FFF5F0] px-3 py-1 rounded-full border border-[#D95D39]/20">
                Panadería Santa Fé
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2 font-serif">
                Recetario Maestro
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Fórmulas, cálculo por kilos y fichas técnicas del taller.
              </p>
            </div>
          </div>

          {/* PIN Input & Keypad */}
          <form onSubmit={handlePinSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 text-center uppercase tracking-wide">
                Ingresa tu clave de acceso
              </label>

              <div className="relative flex items-center justify-center">
                <input
                  type={showPinText ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="•••••"
                  autoFocus
                  className={`w-full text-center text-3xl font-black tracking-widest py-3 px-4 rounded-2xl border-2 bg-slate-50 text-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-[#D95D39]/20 ${
                    pinError ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300 focus:border-[#D95D39]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPinText(!showPinText)}
                  className="absolute right-3 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Ver/Ocultar"
                >
                  {showPinText ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {pinError && (
                <p className="text-xs font-bold text-red-600 text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Clave de seguridad incorrecta
                </p>
              )}
            </div>

            {/* Quick Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-[#D95D39] active:text-white rounded-2xl text-xl font-bold text-slate-800 transition-all shadow-xs cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="py-3 bg-slate-100 hover:bg-red-50 text-red-600 rounded-2xl text-sm font-bold transition-all shadow-xs cursor-pointer select-none"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-[#D95D39] active:text-white rounded-2xl text-xl font-bold text-slate-800 transition-all shadow-xs cursor-pointer select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPinInput(prev => prev.slice(0, -1))}
                className="py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-sm font-bold text-slate-700 transition-all shadow-xs cursor-pointer select-none"
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#D95D39] hover:bg-[#c44e2c] active:scale-98 text-white rounded-2xl font-black text-sm tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Desbloquear Recetario
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active bread photo resolution: custom uploaded > defaultImage > null
  const activeBreadPhoto = activeRecipe ? (recipePhotos[activeRecipe.id] || activeRecipe.defaultImage) : null;

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      
      {/* Top Bar / Master Header */}
      <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950 text-white rounded-2xl p-3 sm:p-4 shadow-md border border-amber-700/50 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center text-xl shrink-0 font-bold">
            📖
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white font-serif">
              Recetario Maestro Santa Fé
            </h1>
            <p className="text-xs text-amber-200/80 font-medium">
              Fórmulas y cálculo automático por kilos
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditingRecipe({
                id: `rec-custom-${Date.now()}`,
                name: '',
                category: 'Bizcocho y Dulce',
                yieldDesc: '1 tanda',
                baseKg: 1,
                bakingTemp: 180,
                bakingTime: '20 min',
                ingredients: [{ name: 'Harina de trigo', amount: 1, unit: 'kg' }],
                procedureSteps: ['']
              });
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Receta
          </button>

          <button
            onClick={handlePrintCurrentRecipe}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
            title="Imprimir hoja técnica de la receta activa"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            Imprimir Hoja
          </button>

          <button
            onClick={handleLockBook}
            className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-500/30 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
            title="Bloquear acceso al recetario"
          >
            <Lock className="w-3.5 h-3.5" />
            Bloquear
          </button>
        </div>
      </div>

      {/* Navigation & Controls Bar */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por pan (concha, bolillo, polvorón...) o ingrediente..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D95D39]/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#D95D39] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Layout Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('sheet')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                viewMode === 'sheet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoja Técnica
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catálogo ({filteredRecipes.length})
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {viewMode === 'grid' ? (
        /* GRID VIEW: All Recipe Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 no-print">
          {filteredRecipes.map((recipe) => {
            const photo = recipePhotos[recipe.id] || recipe.defaultImage;
            const isSelected = activeRecipe?.id === recipe.id;
            const recipeBase = customBaseKgMap[recipe.id] || getRecipeBaseKg(recipe);

            return (
              <div
                key={recipe.id}
                onClick={() => {
                  setSelectedRecipeId(recipe.id);
                  setViewMode('sheet');
                }}
                className={`bg-white rounded-2xl border-2 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col group ${
                  isSelected ? 'border-[#D95D39] ring-2 ring-[#D95D39]/20' : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                {/* Photo Frame Container */}
                <div className="relative h-40 bg-stone-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                  {photo ? (
                    <img
                      src={photo}
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                      <Camera className="w-8 h-8 mb-1 text-slate-300" />
                      <span className="text-[11px] font-bold">Sin foto del pan</span>
                    </div>
                  )}

                  <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-lg">
                    {recipe.category}
                  </span>

                  <span className="absolute bottom-2 left-2 bg-stone-900/80 text-amber-300 text-[10px] font-mono font-black px-2 py-0.5 rounded-md backdrop-blur-2xs">
                    Base: {recipeBase} kg
                  </span>

                  {recipe.bakingTemp && (
                    <span className="absolute bottom-2 right-2 bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                      🔥 {recipe.bakingTemp}°C
                    </span>
                  )}
                </div>

                {/* Recipe Summary Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-serif font-black text-slate-900 text-base leading-snug group-hover:text-[#D95D39] transition-colors">
                      {recipe.name}
                    </h3>
                    {recipe.subtitle && (
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5">
                        {recipe.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-bold">
                    <span>{recipe.ingredients.length} ingredientes</span>
                    <span className="text-[#D95D39] flex items-center gap-0.5 font-black">
                      Calcular por Kg <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SHEET VIEW: Master Technical Bread Workshop Sheet with Real-Time KG Calculator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Quick Recipe Switcher List (Hidden on Print) */}
          <div className="lg:col-span-4 space-y-3 no-print max-h-[88vh] flex flex-col">
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Fórmulas ({filteredRecipes.length})
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Selecciona para abrir
              </span>
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {filteredRecipes.map((recipe) => {
                const isSelected = activeRecipe?.id === recipe.id;
                const photo = recipePhotos[recipe.id] || recipe.defaultImage;
                const recBase = customBaseKgMap[recipe.id] || getRecipeBaseKg(recipe);

                return (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF5F0] border-[#D95D39] shadow-xs ring-1 ring-[#D95D39]/30'
                        : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                    }`}
                  >
                    {/* Tiny thumbnail frame */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {photo ? (
                        <img src={photo} alt={recipe.name} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#D95D39] uppercase tracking-wide">
                          {recipe.category}
                        </span>
                        <span className="text-[10px] text-stone-600 font-mono font-bold bg-stone-100 px-1.5 py-0.2 rounded">
                          Base: {recBase} kg
                        </span>
                      </div>
                      <h4 className={`text-sm font-black truncate font-serif ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                        {recipe.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        {recipe.subtitle || `${recipe.ingredients.length} ingredientes`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full Printable Recipe Sheet (Hoja de Taller) */}
          <div className="lg:col-span-8">
            {activeRecipe ? (
              <div id="recipe-printable-sheet" className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 space-y-4 print:border-none print:shadow-none print:p-0">
                
                {/* 1. Header: Bread Info, Baking Specs & Compact Photo Box */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#D95D39] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                        {activeRecipe.category}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Ficha #{activeRecipe.pageNumber || 1}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif tracking-tight truncate">
                      {activeRecipe.name}
                    </h2>

                    {activeRecipe.subtitle && (
                      <p className="text-xs text-slate-500 font-medium">
                        {activeRecipe.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Baking Metrics & Photo Frame */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {/* Oven & Time Badges */}
                    <div className="flex items-center gap-1.5 text-xs">
                      {activeRecipe.bakingTemp && (
                        <span className="bg-red-50 text-red-900 border border-red-200 px-2 py-1 rounded-xl font-black font-mono">
                          🔥 {activeRecipe.bakingTemp}°C
                        </span>
                      )}
                      {activeRecipe.bakingTime && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-1 rounded-xl font-bold font-mono">
                          ⏱ {activeRecipe.bakingTime}
                        </span>
                      )}
                      {activeRecipe.hasSteam && (
                        <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-1 rounded-xl font-bold text-[11px]">
                          💨 Vapor
                        </span>
                      )}
                    </div>

                    {/* Recuadro para Foto del Pan */}
                    <div
                      onClick={() => {
                        setPhotoModalRecipe(activeRecipe);
                        setCustomPhotoUrlInput('');
                      }}
                      className="relative group w-20 h-16 sm:w-24 sm:h-18 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-amber-500 transition-all shadow-2xs"
                      title="Clic para agregar o cambiar foto del pan"
                    >
                      {activeBreadPhoto ? (
                        <>
                          <img
                            src={activeBreadPhoto}
                            alt={activeRecipe.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black no-print">
                            Cambiar
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-1">
                          <Camera className="w-4 h-4 text-amber-600 mb-0.5" />
                          <span className="text-[9px] font-black text-slate-700 leading-tight">Foto Pan</span>
                          <span className="text-[8px] text-slate-400 no-print">+ Agregar</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. CALCULADORA DIRECTA: "Calculado para 1 kilo" con botones para más o menos (SIN ATAJOS) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-amber-50 via-orange-50/60 to-stone-50 border border-amber-300 rounded-2xl px-3.5 py-2 no-print shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <Scale className="w-4 h-4 text-[#D95D39] shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-slate-800">
                      Calculado para:
                    </span>

                    {/* Stepper Directo [-] [X kilo(s)] [+] */}
                    <div className="inline-flex items-center bg-white border-2 border-amber-400 rounded-xl shadow-xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeTargetKg > 1 
                            ? Math.round((activeTargetKg - 1) * 10) / 10 
                            : Math.max(0.5, Math.round((activeTargetKg - 0.5) * 10) / 10);
                          handleSetTargetKg(next);
                        }}
                        className="w-8 h-7 sm:w-9 sm:h-8 flex items-center justify-center text-base sm:text-lg font-black text-slate-700 hover:bg-amber-100 active:bg-amber-200 transition-colors cursor-pointer select-none"
                        title="Picar para menos kilos (-)"
                      >
                        −
                      </button>

                      <div className="flex items-center px-1.5 py-0.5 border-x border-amber-200">
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          max="500"
                          value={activeTargetKg}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) handleSetTargetKg(val);
                          }}
                          className="w-12 sm:w-14 text-center font-mono font-black text-sm sm:text-base text-[#D95D39] bg-transparent focus:outline-none"
                        />
                        <span className="text-xs font-black font-mono text-slate-600 pl-0.5 select-none">
                          {activeTargetKg === 1 ? 'kilo' : 'kilos'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.round((activeTargetKg + 1) * 10) / 10;
                          handleSetTargetKg(next);
                        }}
                        className="w-8 h-7 sm:w-9 sm:h-8 flex items-center justify-center text-base sm:text-lg font-black text-slate-700 hover:bg-amber-100 active:bg-amber-200 transition-colors cursor-pointer select-none"
                        title="Picar para más kilos (+)"
                      >
                        +
                      </button>
                    </div>

                    {scaleRatio !== 1 && (
                      <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-200">
                        {scaleRatio.toFixed(2)}x
                      </span>
                    )}
                  </div>

                  {/* Base reference & reset */}
                  <div className="flex items-center gap-2">
                    {activeTargetKg !== activeBaseKg ? (
                      <button
                        type="button"
                        onClick={() => handleSetTargetKg(activeBaseKg)}
                        className="text-xs font-bold text-[#D95D39] hover:text-[#c44e2c] bg-white hover:bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-300 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                        title={`Restablecer a la base de la receta (${activeBaseKg} kg)`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restablecer a {activeBaseKg} kg</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditBaseKgInput(String(activeBaseKg));
                          setIsEditingBaseKgModal(true);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Kilos base originales de la receta (clic para modificar)"
                      >
                        <span>Base: {activeBaseKg} kg</span>
                        <Edit3 className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Print Banner Only */}
                <div className="hidden print:block text-xs font-mono font-bold text-slate-700 border-b border-stone-200 pb-1">
                  Fórmula calculada para: <strong>{activeTargetKg} kg</strong> (Base de receta: {activeBaseKg} kg)
                </div>

                {/* Técnica y Rendimiento Compacto */}
                {(activeRecipe.technique || activeRecipe.yieldDesc) && (
                  <div className="bg-[#FAF8F6] px-3.5 py-2 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                    {activeRecipe.technique && (
                      <span className="font-medium text-slate-800">
                        <strong className="text-slate-900 font-bold mr-1">Técnica:</strong>
                        {activeRecipe.technique}
                      </span>
                    )}
                    {activeRecipe.yieldDesc && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Rendimiento est.: <strong className="text-amber-900">{estimatedYield}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* 3. TABLA DE INGREDIENTES COMPACTA Y LEGIBLE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 font-serif flex items-center gap-2">
                      <span>Ingredientes ({activeRecipe.ingredients.length})</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Para amasar <strong>{activeTargetKg} kg</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-stone-200">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 bg-stone-100/80 text-[11px] font-black uppercase text-slate-700 tracking-wider">
                          <th className="py-2.5 px-3">Ingrediente</th>
                          <th className="py-2.5 px-3 text-right bg-amber-500/10 text-amber-950 font-black">
                            Para {activeTargetKg} kg
                          </th>
                          <th className="py-2.5 px-3 text-right text-slate-500 font-bold">
                            Base ({activeBaseKg} kg)
                          </th>
                          <th className="py-2.5 px-3 text-center text-slate-500">
                            % Panadero
                          </th>
                          <th className="py-2.5 px-3 text-slate-600">
                            Fase / Notas
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white">
                        {activeRecipe.ingredients.map((ing, idx) => {
                          const formatted = formatIngredient(ing, scaleRatio, activeBaseKg);
                          return (
                            <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {formatted.name}
                              </td>
                              <td className="py-2 px-3 text-right bg-amber-500/5 font-mono">
                                <span className="font-black text-[#D95D39] text-sm sm:text-base">
                                  {formatted.scaledDisplay}
                                </span>
                                {formatted.detailedNote && (
                                  <span className="block text-[10px] text-amber-800 font-medium">
                                    {formatted.detailedNote}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500 text-xs">
                                {formatted.originalAmount} {formatted.originalUnit || ''}
                              </td>
                              <td className="py-2 px-3 text-center text-xs font-mono font-bold text-slate-600">
                                {formatted.bakerPercentage ? (
                                  <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded text-[10px]">
                                    {formatted.bakerPercentage}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-xs">
                                {formatted.group && (
                                  <span className="bg-stone-100 text-stone-700 font-bold px-1.5 py-0.5 rounded mr-1 text-[10px]">
                                    {formatted.group}
                                  </span>
                                )}
                                {formatted.notes && <span>{formatted.notes}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. PROCEDIMIENTO COMPACTO */}
                {activeRecipe.procedureSteps && activeRecipe.procedureSteps.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 font-serif border-b border-stone-200 pb-1">
                      Procedimiento
                    </h3>

                    <div className="space-y-1.5">
                      {activeRecipe.procedureSteps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-xs sm:text-sm">
                          <span className="w-5 h-5 rounded-full bg-[#D95D39] text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-slate-800 font-medium leading-snug">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. VARIEDADES (SI APLICA) */}
                {activeRecipe.variations && activeRecipe.variations.length > 0 && (
                  <div className="space-y-1.5 pt-1 bg-[#FFF5F0] p-3 rounded-2xl border border-[#D95D39]/20 text-xs">
                    <h4 className="text-xs font-black text-[#D95D39] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Variedades y Sabores</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeRecipe.variations.map((v, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-xl border border-[#E5E1DA]">
                          <strong className="block text-slate-900 font-black mb-0.5">{v.name}</strong>
                          <ul className="text-slate-600 list-disc list-inside space-y-0.5 text-[11px]">
                            {v.ingredients.map((ing, i) => (
                              <li key={i}>{ing}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Printable Footer */}
                <div className="hidden print:block text-center text-xs text-slate-500 pt-4 border-t border-stone-200">
                  <p className="font-bold text-slate-700">Panadería Santa Fé • Ficha Técnica de Taller</p>
                  <p>Fórmula calculada para {activeTargetKg} kg de masa / harina (Base: {activeBaseKg} kg).</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
                Selecciona una receta del listado para ver su hoja técnica.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDITAR KILOS BASE DE LA RECETA */}
      {isEditingBaseKgModal && activeRecipe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D95D39]">
                  Fórmula Base
                </span>
                <h3 className="text-lg font-black text-slate-900 font-serif">
                  Kilos Base de Referencia
                </h3>
              </div>
              <button
                onClick={() => setIsEditingBaseKgModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Indica para cuántos kilos de harina/masa está anotada la receta original de <strong>{activeRecipe.name}</strong> en tu libreta del taller (ej. 8 kg, 6 kg, etc.).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kilos Base Originales:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="100"
                  value={editBaseKgInput}
                  onChange={(e) => setEditBaseKgInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D95D39]"
                />
                <span className="text-sm font-black text-slate-700">kg</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingBaseKgModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomBaseKg}
                className="flex-1 py-2.5 bg-[#D95D39] hover:bg-[#c44e2c] text-white font-black rounded-xl cursor-pointer shadow-md"
              >
                Guardar Base
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBIR O CAMBIAR FOTO DEL PAN */}
      {photoModalRecipe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D95D39]">
                  Recuadro Fotográfico
                </span>
                <h3 className="text-lg font-black text-slate-900 font-serif">
                  Foto para: {photoModalRecipe.name}
                </h3>
              </div>
              <button
                onClick={() => setPhotoModalRecipe(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current photo preview if any */}
            {(recipePhotos[photoModalRecipe.id] || photoModalRecipe.defaultImage) && (
              <div className="aspect-16/9 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                <img
                  src={recipePhotos[photoModalRecipe.id] || photoModalRecipe.defaultImage}
                  alt={photoModalRecipe.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Foto actual
                </span>
              </div>
            )}

            {/* Upload from file or camera */}
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, photoModalRecipe.id)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-[#D95D39] hover:bg-[#c44e2c] text-white rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Tomar Foto con Cámara o Elegir Archivo</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-2 text-[10px] font-bold text-slate-400 uppercase">o pegar enlace web</span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              {/* URL Input */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://ejemplo.com/foto-pan.jpg"
                  value={customPhotoUrlInput}
                  onChange={(e) => setCustomPhotoUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D95D39]/30"
                />
                <button
                  type="button"
                  onClick={() => handleSavePhotoUrl(photoModalRecipe.id)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  Guardar
                </button>
              </div>

              {recipePhotos[photoModalRecipe.id] && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photoModalRecipe.id)}
                  className="w-full py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Foto Personalizada
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA RECETA / EDITOR */}
      {isEditorOpen && editingRecipe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D95D39]">
                  Taller Panadero
                </span>
                <h3 className="text-lg font-black text-slate-900 font-serif">
                  Agregar Nueva Receta al Recetario
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Pan:</label>
                <input
                  type="text"
                  placeholder="Ej. Concha de Vainilla y Canela"
                  value={editingRecipe.name || ''}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D95D39]/30"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría:</label>
                  <select
                    value={editingRecipe.category || 'Bizcocho y Dulce'}
                    onChange={(e) => setEditingRecipe({ ...editingRecipe, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="Salado">Salado</option>
                    <option value="Bizcocho y Dulce">Bizcocho y Dulce</option>
                    <option value="Galletas y Polvorones">Galletas y Polvorones</option>
                    <option value="Pastelería y Repostería">Pastelería y Repostería</option>
                    <option value="Especialidades">Especialidades</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kilos Base:</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ej. 8"
                    value={editingRecipe.baseKg || 1}
                    onChange={(e) => setEditingRecipe({ ...editingRecipe, baseKg: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rendimiento:</label>
                  <input
                    type="text"
                    placeholder="Ej. 1 tanda de 50 piezas"
                    value={editingRecipe.yieldDesc || ''}
                    onChange={(e) => setEditingRecipe({ ...editingRecipe, yieldDesc: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Temperatura (°C):</label>
                  <input
                    type="number"
                    value={editingRecipe.bakingTemp || 180}
                    onChange={(e) => setEditingRecipe({ ...editingRecipe, bakingTemp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiempo de Horno:</label>
                  <input
                    type="text"
                    placeholder="Ej. 18 min"
                    value={editingRecipe.bakingTime || ''}
                    onChange={(e) => setEditingRecipe({ ...editingRecipe, bakingTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ingredientes list builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Ingredientes:</label>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = editingRecipe.ingredients || [];
                      setEditingRecipe({
                        ...editingRecipe,
                        ingredients: [...cur, { name: '', amount: 1, unit: 'kg' }]
                      });
                    }}
                    className="text-[#D95D39] font-black text-xs hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Ingrediente
                  </button>
                </div>

                {(editingRecipe.ingredients || []).map((ing, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nombre ingrediente"
                      value={ing.name}
                      onChange={(e) => {
                        const cur = [...(editingRecipe.ingredients || [])];
                        cur[i].name = e.target.value;
                        setEditingRecipe({ ...editingRecipe, ingredients: cur });
                      }}
                      className="flex-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Cant."
                      value={ing.amount}
                      onChange={(e) => {
                        const cur = [...(editingRecipe.ingredients || [])];
                        cur[i].amount = e.target.value;
                        setEditingRecipe({ ...editingRecipe, ingredients: cur });
                      }}
                      className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Unidad (kg, grs)"
                      value={ing.unit || ''}
                      onChange={(e) => {
                        const cur = [...(editingRecipe.ingredients || [])];
                        cur[i].unit = e.target.value;
                        setEditingRecipe({ ...editingRecipe, ingredients: cur });
                      }}
                      className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (editingRecipe.ingredients || []).filter((_, idx) => idx !== i);
                        setEditingRecipe({ ...editingRecipe, ingredients: cur });
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Procedimiento */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700">Procedimiento Paso a Paso:</label>
                {(editingRecipe.procedureSteps || []).map((step, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="font-bold text-slate-400 w-5">{i + 1}.</span>
                    <input
                      type="text"
                      placeholder={`Paso ${i + 1}`}
                      value={step}
                      onChange={(e) => {
                        const cur = [...(editingRecipe.procedureSteps || [])];
                        cur[i] = e.target.value;
                        setEditingRecipe({ ...editingRecipe, procedureSteps: cur });
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const cur = editingRecipe.procedureSteps || [];
                    setEditingRecipe({
                      ...editingRecipe,
                      procedureSteps: [...cur, '']
                    });
                  }}
                  className="text-[#D95D39] font-black text-xs hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Paso
                </button>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingRecipe.name) return;
                    const newRec: BakeryRecipe = {
                      id: editingRecipe.id || `rec-custom-${Date.now()}`,
                      pageNumber: allRecipes.length + 1,
                      name: editingRecipe.name,
                      category: (editingRecipe.category as any) || 'Bizcocho y Dulce',
                      yieldDesc: editingRecipe.yieldDesc,
                      baseKg: editingRecipe.baseKg || 1,
                      bakingTemp: editingRecipe.bakingTemp,
                      bakingTime: editingRecipe.bakingTime,
                      ingredients: editingRecipe.ingredients || [],
                      procedureSteps: (editingRecipe.procedureSteps || []).filter(s => s.trim().length > 0)
                    };
                    setCustomRecipes(prev => [...prev, newRec]);
                    setSelectedRecipeId(newRec.id);
                    setIsEditorOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-[#D95D39] hover:bg-[#c44e2c] text-white font-black rounded-xl cursor-pointer shadow-md"
                >
                  Guardar Receta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
