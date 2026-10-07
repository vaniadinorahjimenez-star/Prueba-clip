export interface RecipeIngredient {
  name: string;
  amount: number | string;
  unit?: string;
  notes?: string;
  group?: string; // e.g. "Cremar", "Agregar", "Pasta", "Decorar"
}

export interface BakeryRecipe {
  id: string;
  pageNumber: number;
  name: string;
  subtitle?: string;
  category: 'Salado' | 'Bizcocho y Dulce' | 'Galletas y Polvorones' | 'Pastelería y Repostería' | 'Especialidades';
  yieldDesc?: string;
  baseKg?: number; // Kilos de harina o masa de la receta base original
  bakingTemp?: number;
  bakingTime?: string;
  hasSteam?: boolean;
  technique?: string;
  ingredients: RecipeIngredient[];
  procedureSteps: string[];
  variations?: { name: string; ingredients: string[] }[];
  defaultImage?: string;
  customImageKey?: string;
  notes?: string[];
}

export function getRecipeBaseKg(recipe: BakeryRecipe): number {
  if (recipe.baseKg && recipe.baseKg > 0) return recipe.baseKg;
  let flourKg = 0;
  for (const ing of recipe.ingredients) {
    const lower = ing.name.toLowerCase();
    if (lower.includes('harina') || lower.includes('mix') || lower.includes('masa base') || lower.includes('masa por')) {
      if (typeof ing.amount === 'number') {
        if (ing.unit === 'kg') flourKg += ing.amount;
        else if (ing.unit === 'grs' || ing.unit === 'g') flourKg += ing.amount / 1000;
      }
    }
  }
  if (flourKg > 0) return Number(flourKg.toFixed(2));
  
  for (const ing of recipe.ingredients) {
    if (ing.unit === 'kg' && typeof ing.amount === 'number' && ing.amount > 0) {
      return ing.amount;
    }
  }
  return 1;
}

export const SANTA_FE_RECIPES: BakeryRecipe[] = [
  {
    id: 'rec-berrinches',
    pageNumber: 3,
    name: 'Berrinches',
    subtitle: 'Muffins artesanales de salvado, amaranto, granola y cítricos',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 receta completa (o media receta)',
    bakingTemp: 180,
    bakingTime: '20 min',
    technique: 'Cremado y batido',
    defaultImage: 'https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Mantequilla', amount: 1, unit: 'kg', notes: '(o 500 grs para media)', group: '1. Cremar' },
      { name: 'Azúcar', amount: 1, unit: 'kg', notes: '(o 500 grs para media)', group: '1. Cremar' },
      { name: 'Huevos', amount: 24, unit: 'piezas', notes: '(o 12 pzas para media)', group: '1. Cremar' },
      { name: 'Harina', amount: 1.4, unit: 'kg', notes: '(o 700 grs para media)', group: '2. Agregar y Batir' },
      { name: 'Leche', amount: 400, unit: 'ml', notes: '(o 200 ml para media)', group: '2. Agregar y Batir' },
      { name: 'Polvo para hornear (Royal)', amount: 40, unit: 'grs', notes: '(o 20 grs para media)', group: '2. Agregar y Batir' }
    ],
    procedureSteps: [
      'Cremar la mantequilla con el azúcar y los huevos.',
      'Agregar la harina cernida, la leche y el polvo para hornear (royal).',
      'Batir hasta lograr una mezcla homogénea y sedosa.',
      'Dividir y agregar el saborizante o fruta deseada según la variedad.',
      'Vaciar en capacillos o moldes y hornear a 180°C durante 20 minutos.'
    ],
    variations: [
      { name: 'Plátano - Salvado', ingredients: ['1 plátano y medio machacado', 'Salvado de trigo al gusto'] },
      { name: 'Manzana canela - Amaranto', ingredients: ['1 manzana picada o rallada', 'Canela en polvo', 'Amaranto natural'] },
      { name: 'Zanahoria - Granola', ingredients: ['1 zanahoria fresca rallada', 'Granola tostada artesanal'] },
      { name: 'Naranja - Natural', ingredients: ['1 naranja (jugo y ralladura de cáscara)'] }
    ]
  },
  {
    id: 'rec-birote-artesanal',
    pageNumber: 4,
    name: 'Birote Artesanal',
    subtitle: 'Pan blanco rústico con masa madre O-tentic y harina integral',
    category: 'Salado',
    yieldDesc: 'Tanda artesanal crujiente',
    bakingTemp: 200,
    bakingTime: '20 a 25 min',
    technique: 'Amasado elástico y fermentación',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina blanca', amount: 750, unit: 'grs' },
      { name: 'Harina integral artesanal', amount: 250, unit: 'grs' },
      { name: 'Mejorante', amount: 5, unit: 'grs' },
      { name: 'Levadura', amount: 30, unit: 'grs' },
      { name: 'O-tentic (Masa madre activa)', amount: 7, unit: 'grs' },
      { name: 'Sal', amount: 25, unit: 'grs' },
      { name: 'Agua', amount: 600, unit: 'ml' }
    ],
    procedureSteps: [
      'Mezclar la harina blanca con la harina integral artesanal, el mejorante, la sal y O-tentic.',
      'Incorporar la levadura disuelta en parte del agua.',
      'Amasar agregando el agua gradualmente hasta obtener una masa elástica y sedosa.',
      'Dividir en porciones, bolear y reposar.',
      'Formar los birotes con puntas alargadas y greñar al centro.',
      'Hornear a 200°C de 20 a 25 minutos con vapor para lograr corteza crujiente dorada.'
    ]
  },
  {
    id: 'rec-bizcocho',
    pageNumber: 5,
    name: 'Bizcocho Tradicional',
    subtitle: 'Masa madre enriquecida para conchas, cuernos y pan dulce clásico',
    category: 'Bizcocho y Dulce',
    yieldDesc: 'Tanda maestra de taller (17 kg de masa)',
    bakingTemp: 180,
    bakingTime: '17 min',
    technique: 'Amasado de enriquecimiento en batidora/amasadora',
    defaultImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina blanca', amount: 8, unit: 'kg' },
      { name: 'Mix bizcocho', amount: 1, unit: 'kg' },
      { name: 'Mantequilla la abuelita', amount: 1600, unit: 'grs' },
      { name: 'Azúcar', amount: 2400, unit: 'grs' },
      { name: 'Sal', amount: 80, unit: 'grs' },
      { name: 'Mejorante', amount: 40, unit: 'grs' },
      { name: 'Huevo fresco', amount: 1.5, unit: 'lts' },
      { name: 'Agua', amount: 2.5, unit: 'lts' },
      { name: 'Levadura', amount: 100, unit: 'grs' }
    ],
    procedureSteps: [
      'Poner en la amasadora la harina blanca, el mix bizcocho, sal, azúcar y mejorante.',
      'Agregar el huevo y parte del agua. Iniciar en primera velocidad.',
      'Incorporar la mantequilla la abuelita y amasar hasta integrar.',
      'Añadir la levadura disuelta en el resto del agua y pasar a segunda velocidad hasta dar punto de tela o liga.',
      'Cortar, bolear, tapar con pasta de concha o formar piezas de bizcocho.',
      'Fermentar en cámara hasta doblar volumen y hornear a 180°C por 17 minutos.'
    ]
  },
  {
    id: 'rec-bolillo-integral',
    pageNumber: 6,
    name: 'Bolillo Integral',
    subtitle: 'Bolillo saludable 100% integral artesanal',
    category: 'Salado',
    yieldDesc: 'Aproximadamente 20 a 25 bolillos',
    bakingTemp: 230,
    bakingTime: '15 min',
    hasSteam: true,
    technique: 'Amasado con vapor de horneado',
    defaultImage: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina integral artesanal', amount: 1, unit: 'kg' },
      { name: 'Agua', amount: 550, unit: 'ml' },
      { name: 'Levadura', amount: 30, unit: 'grs' },
      { name: 'Mejorante', amount: 5, unit: 'grs' }
    ],
    procedureSteps: [
      'Mezclar la harina integral con el mejorante y levadura.',
      'Agregar el agua poco a poco y amasar hasta obtener una masa manejable y suave.',
      'Reposar la masa en bloque 15 minutos en mesa cubierta.',
      'Cortar tantos de 80 a 90 gramos, bolear y formar los bolillos integrales.',
      'Colocar en charolas, fermentar, greñar corte longitudinal y hornear a 230°C por 15 minutos con vapor.'
    ]
  },
  {
    id: 'rec-bolillo',
    pageNumber: 7,
    name: 'Bolillo Tradicional',
    subtitle: 'Producto ancla de Santa Fé con corteza crujiente y migajón suave',
    category: 'Salado',
    yieldDesc: 'Tanda de 8 kg de harina (~95 a 105 bolillos de 12 pzas/charola)',
    baseKg: 8,
    bakingTemp: 250,
    bakingTime: '11 min 5 seg',
    hasSteam: true,
    technique: 'Refinado en cilindro / refinadora y vapor en horno',
    defaultImage: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina blanca', amount: 8, unit: 'kg' },
      { name: 'Azúcar', amount: 400, unit: 'grs' },
      { name: 'Sal', amount: 160, unit: 'grs' },
      { name: 'Mejorante S500', amount: 100, unit: 'grs' },
      { name: 'Agua', amount: 5, unit: 'lts' },
      { name: 'Levadura fresca (proceso normal)', amount: 135, unit: 'grs', notes: 'o 40 grs levadura en polvo' },
      { name: 'Levadura fresca (proceso rápido)', amount: 265, unit: 'grs', notes: 'o 40 grs levadura en polvo' }
    ],
    procedureSteps: [
      'Revolver harina, azúcar, sal, mejorante S500 y el agua en amasadora.',
      'Refinar la masa pasándola por los rodillos hasta obtener una textura completamente lisa y sedosa.',
      'Incorporar la levadura fresca (135 grs normal o 265 grs para proceso rápido).',
      'Pesar los tantos a 80-85 gramos, bolear y reposar.',
      'Formar los bolillos con las dos manos estirando las puntas.',
      'Acomodar en charolas a 12 piezas por charola (estándar fijo Santa Fé).',
      'Fermentar, greñar en diagonal al centro y hornear a 250°C durante 11 minutos con 5 segundos con vapor abundante.'
    ]
  },
  {
    id: 'rec-brownie',
    pageNumber: 8,
    name: 'Brownie de Chocolate y Nuez',
    subtitle: 'Textura fudgy húmeda con chocolate fundido y nuez picada',
    category: 'Pastelería y Repostería',
    yieldDesc: '64 piezas totales (Grande: 40 pzas de 7.5x8 cm | Chico: 24 pzas de 7.5x7.5 cm)',
    bakingTemp: 180,
    bakingTime: '35 min',
    technique: 'Baño María, cremado y horneado en charola plancha',
    defaultImage: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Mantequilla', amount: 2, unit: 'kg', group: '1. Baño María (Disolver)' },
      { name: 'Chocolate semiamargo', amount: 2, unit: 'kg', group: '1. Baño María (Disolver)' },
      { name: 'Huevo fresco', amount: 1.6, unit: 'lt', group: '2. Cremar' },
      { name: 'Azúcar', amount: 2, unit: 'kg', group: '2. Cremar' },
      { name: 'Harina de trigo', amount: 1.6, unit: 'kg', group: '3. Integrar y Batir' },
      { name: 'Nuez picada', amount: 100, unit: 'grs', group: '3. Integrar y Batir' },
      { name: 'Cocoa pura en polvo', amount: 200, unit: 'grs', group: '3. Integrar y Batir' },
      { name: 'Nuez picada para decorar', amount: 100, unit: 'grs', group: '4. Decoración' }
    ],
    procedureSteps: [
      'Disolver la mantequilla y el chocolate a Baño María hasta que estén completamente fluidos y brillantes.',
      'En el tazón de la batidora, cremar el huevo con el azúcar.',
      'Agregar la mezcla tibia de mantequilla y chocolate fundido al tazón y batir.',
      'Añadir la harina cernida, la cocoa en polvo y los 100 grs de nuez picada.',
      'Batir lo suficiente hasta emulsionar la masa.',
      'Extender en moldes o charolas rectangulares empapeladas y espolvorear los 100 grs de nuez restantes encima.',
      'Hornear a 180°C durante 35 minutos.',
      'Dejar enfriar completamente antes de cortar en 64 piezas (40 grandes de 7.5x8 cm y 24 chicas de 7.5x7.5 cm).'
    ]
  },
  {
    id: 'rec-campechana',
    pageNumber: 9,
    name: 'Campechana',
    subtitle: 'Hojaldre tradicional crujiente con cubierta azucarada caramelizada',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 tanda de campechanas',
    bakingTemp: 200,
    bakingTime: '20 min',
    technique: 'Doble amasado (masa base y pasta de manteca batida a mano)',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina (Masa)', amount: 2, unit: 'kg', group: 'Masa Base' },
      { name: 'Mantequilla', amount: 250, unit: 'grs', group: 'Masa Base' },
      { name: 'Manteca vegetal', amount: 250, unit: 'grs', group: 'Masa Base' },
      { name: 'Azúcar', amount: 150, unit: 'grs', notes: '(o 50 grs para pasta suave)', group: 'Masa Base' },
      { name: 'Sal', amount: '1/2', unit: 'cucharada', group: 'Masa Base' },
      { name: 'Harina (Pasta)', amount: 800, unit: 'grs', group: 'Pasta de Empaste' },
      { name: 'Manteca (Pasta)', amount: 800, unit: 'grs', group: 'Pasta de Empaste' }
    ],
    procedureSteps: [
      'Para la masa base: Revolver y casi ligar la harina, mantequilla, manteca, azúcar y la media cucharada de sal.',
      'Para la pasta: Batir a mano los 800 grs de harina con los 800 grs de manteca hasta formar pomada suave.',
      'Empastar la masa con la pasta batiendo a mano y extender en láminas.',
      'Cortar rectángulos, untar azúcar y hornear a 200°C por 20 minutos hasta inflar y caramelizar.'
    ]
  },
  {
    id: 'rec-choux',
    pageNumber: 10,
    name: 'Pasta Choux',
    subtitle: 'Masa cocida para profiteroles, eclairs y cisnes rellenos',
    category: 'Pastelería y Repostería',
    yieldDesc: 'Aprox. 40 a 50 piezas de profiteroles',
    bakingTemp: 180,
    bakingTime: '28 min',
    technique: 'Cocción en cacerola (término engrudo) e incorporación en batidora',
    defaultImage: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Margarina', amount: 250, unit: 'grs', group: '1. Hervir' },
      { name: 'Leche', amount: 250, unit: 'ml', group: '1. Hervir' },
      { name: 'Agua', amount: 250, unit: 'ml', group: '1. Hervir' },
      { name: 'Azúcar', amount: 80, unit: 'grs', group: '1. Hervir' },
      { name: 'Harina de trigo', amount: 350, unit: 'grs', group: '2. Cernir y Engrudo' },
      { name: 'Sal', amount: 15, unit: 'grs', group: '3. Batir' },
      { name: 'Huevos', amount: 7, unit: 'piezas', notes: '(incorporar en 3 eventos)', group: '3. Batir' }
    ],
    procedureSteps: [
      'Poner a hervir la margarina, leche, agua y azúcar en cacerola.',
      'Cernir la harina y agregar de golpe lentamente mientras hierve, moviendo enérgicamente hasta lograr término engrudo que despegue del fondo.',
      'Sacar a enfriar en la mesa de trabajo.',
      'Pasar a la batidora en 2.ª velocidad e incorporar los 15 grs de sal.',
      'Agregar los 7 huevos divididos en 3 eventos, esperando que cada uno se absorba.',
      'Duguear / formar las piezas con manga pastelera en charolas engrasadas.',
      'Hornear a 180°C durante 28 minutos sin abrir el horno.'
    ]
  },
  {
    id: 'rec-cocol-anis',
    pageNumber: 11,
    name: 'Cocol de Anís',
    subtitle: 'Pan tradicional con piloncillo aromático, anís y masa madre de bolillo',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 tanda tradicional de cocoles',
    bakingTemp: 170,
    bakingTime: '13 min',
    technique: 'Batido con pala y reposo de fermentación',
    defaultImage: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Anís en grano', amount: 1, unit: 'puño' },
      { name: 'Harina de trigo', amount: 1, unit: 'kg' },
      { name: 'Miel de piloncillo', amount: 500, unit: 'ml' },
      { name: 'Agua', amount: 100, unit: 'ml' },
      { name: 'Masa de bolillo (pie de masa)', amount: 500, unit: 'grs' },
      { name: 'Manteca vegetal', amount: 500, unit: 'grs' },
      { name: 'Levadura fresca', amount: 180, unit: 'grs' },
      { name: 'Levadura seca', amount: 20, unit: 'grs' }
    ],
    procedureSteps: [
      'Batir con pala en la batidora: 1 puño de anís, 1 kg de harina, 500 ml de miel de piloncillo, 100 ml de agua, 500 grs de masa de bolillo y 500 grs de manteca vegetal.',
      'Revolver y trabajar en 2.ª velocidad hasta ligar la masa.',
      'Agregar los 180 grs de levadura fresca y los 20 grs de levadura seca.',
      'Trabajar 2 minutos en 2.ª velocidad.',
      'Cortar rombos típicos de cocol, barnizar con piloncillo o huevo y espolvorear ajonjolí si se desea.',
      'Hornear a 170°C por 13 minutos.'
    ]
  },
  {
    id: 'rec-cremaquilla',
    pageNumber: 12,
    name: 'Cremaquilla',
    subtitle: 'Crema de mantequilla sedosa para rellenos y decoración de pasteles',
    category: 'Pastelería y Repostería',
    yieldDesc: 'Aprox. 4.2 kg de cremaquilla fina',
    technique: 'Cremado por velocidades en batidora',
    defaultImage: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Mantequilla la abuelita', amount: 1, unit: 'kg' },
      { name: 'Margarina azul', amount: 1, unit: 'kg' },
      { name: 'Manteca vegetal', amount: 500, unit: 'grs' },
      { name: 'Azúcar refinada', amount: 500, unit: 'grs' },
      { name: 'Azúcar glas', amount: 500, unit: 'grs' },
      { name: 'Harina', amount: 200, unit: 'grs' }
    ],
    procedureSteps: [
      'Cremar la mantequilla en la batidora.',
      'Agregar el azúcar refinada y azúcar glas y batir.',
      'Añadir la manteca vegetal y la margarina azul, batiendo hasta integrar.',
      'Adicionar la harina cernida.',
      'Batir 5 minutos en 2.ª velocidad.',
      'Batir 2 minutos en 3.ª velocidad hasta blanquear y lograr volumen esponjoso.'
    ]
  },
  {
    id: 'rec-croissant-mix',
    pageNumber: 13,
    name: 'Croissant Mix',
    subtitle: 'Croissant hojaldrado con laminado de mantequilla y fermentación',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 tanda de croissants finos',
    bakingTemp: 160,
    bakingTime: '25 min',
    technique: 'Amasado elástico, laminado con 3 vueltas y refrigeración',
    defaultImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Mix croissant', amount: 1, unit: 'kg', group: 'Masa' },
      { name: 'Levadura fresca', amount: 20, unit: 'grs', group: 'Masa' },
      { name: 'Agua', amount: 500, unit: 'ml', group: 'Masa' },
      { name: 'Mantequilla para empaste', amount: 450, unit: 'grs', group: 'Empaste' }
    ],
    procedureSteps: [
      'Amasar el mix de croissant con la levadura fresca y el agua hasta dar textura elástica.',
      'Reposar la masa en frío durante 15 minutos.',
      'Colocar el bloque de empaste con 450 grs de mantequilla en el centro de la masa extendida.',
      'Laminar dando 3 vueltas simples con intervalos de refrigeración entre cada una.',
      'Estirar la masa a 4 mm, cortar triángulos y enrollar para formar los cuernos.',
      'Reposar y fermentar durante 1 hora en cámara tibia.',
      'Barnizar con huevo y hornear a 160°C por 25 minutos.'
    ]
  },
  {
    id: 'rec-dona',
    pageNumber: 14,
    name: 'Dona',
    subtitle: 'Donas fritas suaves glaseadas, con chocolate o azúcar y canela',
    category: 'Bizcocho y Dulce',
    yieldDesc: '75 donas grandes (65 grs) o 100 donas mini (30 grs) por cada 5 kg',
    bakingTemp: 155,
    bakingTime: '2 a 3 min por lado',
    technique: 'Fritura en aceite a 155°C',
    defaultImage: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina de bizcocho', amount: 2.5, unit: 'kg' },
      { name: 'Harina normal', amount: 2.5, unit: 'kg' },
      { name: 'Mejorante', amount: 12.5, unit: 'grs' },
      { name: 'Sal', amount: 25, unit: 'grs' },
      { name: 'Azúcar', amount: 300, unit: 'grs' },
      { name: 'Margarina', amount: 300, unit: 'grs' },
      { name: 'Huevos', amount: 12, unit: 'piezas' },
      { name: 'Agua', amount: 1.5, unit: 'litros' },
      { name: 'Levadura fresca', amount: 60, unit: 'grs' }
    ],
    procedureSteps: [
      'Mezclar harinas, sal, azúcar y mejorante en la artesa.',
      'Incorporar los huevos, margarina y el agua con la levadura.',
      'Amasar hasta lograr masa elástica que despegue por completo.',
      'Reposar 20 minutos, extender a 1 cm de grosor y cortar con molde de dona.',
      'Fermentar hasta que doblen volumen y se sientan ligeras.',
      'Freír en manteca o aceite vegetal caliente a 155°C durante 1.5 minutos por lado.',
      'Escurrir y revolcar en azúcar con canela o glasear con chocolate.'
    ],
    notes: [
      'Pesos estándar: Grande 65 gramos | Chica 30 gramos.',
      'Rendimiento: 75 donas grandes o 100 donas mini por cada 5 kg de masa.'
    ]
  },
  {
    id: 'rec-feite',
    pageNumber: 15,
    name: 'Feite (Masa de Hojaldre & Orejas)',
    subtitle: 'Hojaldre crujiente milhojas para orejas, banderillas y conos',
    category: 'Bizcocho y Dulce',
    yieldDesc: 'Bastones de 3.5 kg con 1.4 kg de margarina feite',
    bakingTemp: 225,
    bakingTime: '17 min',
    technique: 'Laminado de 4 vueltas en laminadora y 1 al formar',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina de trigo', amount: 7.5, unit: 'kg', group: 'Masa Base' },
      { name: 'Sal', amount: 40, unit: 'grs', group: 'Masa Base' },
      { name: 'Margarina roja feite', amount: 350, unit: 'grs', group: 'Masa Base' },
      { name: 'Mantequilla', amount: 400, unit: 'grs', group: 'Masa Base' },
      { name: 'Agua', amount: 3.5, unit: 'lts', group: 'Masa Base' },
      { name: 'Color amarillo huevo', amount: 'Al gusto', unit: '', group: 'Masa Base' },
      { name: 'Masa por bastón', amount: 3.5, unit: 'kg', group: 'Empaste Bastón' },
      { name: 'Margarina feite para empaste', amount: 1400, unit: 'grs', group: 'Empaste Bastón' }
    ],
    procedureSteps: [
      'Revolver sin ligar la harina, sal, margarina roja, mantequilla, agua y color amarillo.',
      'Dividir en bastones de 3.5 kgs de masa.',
      'Empastar cada bastón con 1.400 kg de margarina roja feite especial.',
      'Dar 4 vueltas en la laminadora mecánica con sus respectivos reposos.',
      'Dar una vuelta más al momento de formar.',
      'Para Orejas: Azucarar la mesa con abundante azúcar, doblar los extremos hacia el centro, cortar y hornear a 225°C por 17 minutos.'
    ]
  },
  {
    id: 'rec-galleta-gragea',
    pageNumber: 16,
    name: 'Galleta de Gragea',
    subtitle: 'Galleta tradicional crujiente cubierta de chochitos de colores',
    category: 'Galletas y Polvorones',
    yieldDesc: '1 charola de galletas de gragea',
    bakingTemp: 200,
    bakingTime: '17 min',
    technique: 'Cremado e integración en modo pasta',
    defaultImage: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Azúcar', amount: 400, unit: 'grs', group: '1. Cremar' },
      { name: 'Margarina', amount: 600, unit: 'grs', group: '1. Cremar' },
      { name: 'Huevo', amount: 165, unit: 'grs', group: '2. Integrar (Modo Pasta)' },
      { name: 'Leche', amount: 100, unit: 'ml', group: '2. Integrar (Modo Pasta)' },
      { name: 'Harina', amount: 1, unit: 'kg', group: '2. Integrar (Modo Pasta)' },
      { name: 'Polvo para hornear (Royal)', amount: 30, unit: 'grs', group: '2. Integrar (Modo Pasta)' }
    ],
    procedureSteps: [
      'Cremar el azúcar con la margarina hasta que esponje.',
      'Integrar en modo pasta el huevo pesado (165 grs) y los 100 ml de leche.',
      'Añadir la harina cernida con los 30 grs de royal sin amasar en exceso.',
      'Cortar discos o porcionar, pasar por gragea multicolor presionando ligeramente.',
      'Colocar en charola y hornear a 200°C durante 17 minutos.'
    ]
  },
  {
    id: 'rec-galleta-avena',
    pageNumber: 17,
    name: 'Galleta de Avena y Naranja',
    subtitle: 'Galleta rústica con avena caramelizada, naranja y leche nido',
    category: 'Galletas y Polvorones',
    yieldDesc: 'Tanda con opción a congelación de bolita',
    bakingTemp: 200,
    bakingTime: '20 min',
    technique: 'Cremado, cortadora con aceite y congelación de bolitas',
    defaultImage: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Azúcar morena', amount: 200, unit: 'grs', group: '1. Cremar' },
      { name: 'Azúcar blanca', amount: 200, unit: 'grs', group: '1. Cremar' },
      { name: 'Mantequilla', amount: 500, unit: 'grs', group: '1. Cremar' },
      { name: 'Huevos', amount: 8, unit: 'piezas', group: '2. Integrar' },
      { name: 'Esencia de naranja', amount: 100, unit: 'ml', group: '2. Integrar' },
      { name: 'Harina', amount: 1500, unit: 'grs', group: '2. Integrar' },
      { name: 'Levadura en polvo', amount: 20, unit: 'grs', group: '2. Integrar' },
      { name: 'Leche Nido en polvo', amount: 200, unit: 'grs', group: '2. Integrar' },
      { name: 'Bicarbonato de sodio (Carbonato)', amount: 13, unit: 'grs', group: '2. Integrar' },
      { name: 'Avena caramelizada para decorar', amount: 300, unit: 'grs', group: '3. Decorar' }
    ],
    procedureSteps: [
      'Cremar el azúcar morena, azúcar blanca y la mantequilla.',
      'Integrar en modo pasta los 8 huevos y los 100 ml de esencia de naranja.',
      'Añadir la harina, levadura en polvo, leche nido y el carbonato.',
      'Meter a la cortadora lubricando con aceite para sacar porciones uniformes.',
      'Revolcar o cubrir con los 300 grs de avena caramelizada.',
      'Nota técnica: Se puede congelar la bolita porcionada hasta por un mes.',
      'Hornear a 200°C por 20 minutos.'
    ]
  },
  {
    id: 'rec-galleta-mantequilla',
    pageNumber: 18,
    name: 'Galleta de Mantequilla',
    subtitle: 'Galleta fina suave y arenosa para té, figuras y eventos',
    category: 'Galletas y Polvorones',
    yieldDesc: '1 tanda grande de galletas de mantequilla fina',
    bakingTemp: 180,
    bakingTime: '15 min',
    technique: 'Cremado y corte de figuras',
    defaultImage: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Mantequilla pura', amount: 2, unit: 'kg', group: '1. Cremar' },
      { name: 'Azúcar glas', amount: 700, unit: 'grs', group: '1. Cremar' },
      { name: 'Harina de trigo', amount: 2.4, unit: 'kg', group: '2. Integrar' }
    ],
    procedureSteps: [
      'Cremar los 2 kg de mantequilla con los 700 grs de azúcar glas en la batidora hasta blanquear.',
      'Integrar los 2.400 kg de harina con movimientos suaves hasta que no queden grumos.',
      'Extender la masa a 5 mm de grosor y cortar con moldes de figuras.',
      'Colocar en charolas y hornear a 180°C durante 15 minutos sin que dore en exceso.'
    ]
  },
  {
    id: 'rec-mufin-elote',
    pageNumber: 19,
    name: 'Muffin de Elote',
    subtitle: 'Panqueque húmedo de granos de elote natural con queso crema',
    category: 'Pastelería y Repostería',
    yieldDesc: 'Aprox. 18 a 24 muffins de elote',
    bakingTemp: 180,
    bakingTime: '25 min',
    technique: 'Licuadora rápida y horneado en molde',
    defaultImage: 'https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Elotes tiernos desgranados', amount: 7, unit: 'piezas' },
      { name: 'Leche condensada (La Lechera)', amount: 450, unit: 'ml' },
      { name: 'Leche evaporada (Clavel)', amount: 450, unit: 'ml' },
      { name: 'Polvo para hornear (Royal)', amount: '1 1/2', unit: 'cucharadas' },
      { name: 'Queso crema', amount: 250, unit: 'grs' },
      { name: 'Harina de trigo', amount: 1, unit: 'puño' }
    ],
    procedureSteps: [
      'Colocar en el vaso de la licuadora los 7 elotes desgranados, la lechera, la leche clavel, el royal, el queso crema y el puño de harina.',
      'Licuar todo hasta que quede una masa integrada pero con textura de elote.',
      'Vaciar en capacillos o moldes para muffin engrasados a 3/4 de su capacidad.',
      'Hornear a 180°C por 25 minutos hasta que un palillo salga limpio.'
    ]
  },
  {
    id: 'rec-multi-pound-cake',
    pageNumber: 20,
    name: 'Multi Pound Cake',
    subtitle: 'Panqué inglés tradicional con naranja, migajón fino y corteza dorada',
    category: 'Pastelería y Repostería',
    yieldDesc: 'Cuatro moldes rectangulares iguales con tapa',
    bakingTemp: 180,
    bakingTime: '40 min a 180°C y 40 min a 160°C',
    technique: 'Cremado, emulsión en batidora y doble horneado con molde tapado',
    defaultImage: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Mantequilla', amount: 750, unit: 'grs', group: '1. Cremar' },
      { name: 'Aceite vegetal', amount: 1.25, unit: 'lts', notes: '(1250 ml)', group: '1. Cremar' },
      { name: 'Huevo fresco', amount: 2, unit: 'lts', group: '2. Integrar' },
      { name: 'Leche', amount: 1, unit: 'lt', group: '2. Integrar' },
      { name: 'Harina especial pound cake', amount: 4, unit: 'kg', group: '2. Integrar' },
      { name: 'Esencia de naranja', amount: 100, unit: 'ml', group: '2. Integrar' },
      { name: 'Ralladura fresca de naranja', amount: 'Al gusto', unit: '', group: '2. Integrar' }
    ],
    procedureSteps: [
      'Cremar la mantequilla con el aceite en el tazón de la batidora.',
      'Integrar el huevo, la leche, la harina pound cake, la esencia de naranja y la ralladura.',
      'Batir considerablemente a velocidad media hasta lograr una emulsión esponjosa y uniforme.',
      'Llenar cuatro moldes iguales y taparlos.',
      'Primera etapa de horneado: 180°C durante 40 minutos.',
      'Segunda etapa de horneado: Bajar la temperatura a 160°C durante otros 40 minutos para cocción perfecta al centro.'
    ]
  },
  {
    id: 'rec-ojo-pancha',
    pageNumber: 21,
    name: 'Ojo de Pancha',
    subtitle: 'Pieza tradicional hojaldrada con centro suave y azúcar caramelizada',
    category: 'Bizcocho y Dulce',
    yieldDesc: 'Pesada de 3 kg aprox. paloteada',
    bakingTemp: 180,
    bakingTime: '17 min',
    technique: 'Paloteado en 3 pasadas, recorte y doblez en 3',
    defaultImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina', amount: 1800, unit: 'grs' },
      { name: 'Manteca vegetal', amount: 200, unit: 'grs' },
      { name: 'Azúcar', amount: 200, unit: 'grs' },
      { name: 'Sal', amount: 20, unit: 'grs' },
      { name: 'Levadura', amount: 15, unit: 'grs' },
      { name: 'Agua', amount: 900, unit: 'ml' },
      { name: 'Aceite vegetal y azúcar estándar', amount: 'Cantidad necesaria', unit: '', notes: 'Para untar y pegar' }
    ],
    procedureSteps: [
      'Revolver harina, manteca, azúcar, sal, levadura y agua.',
      'Batir con pala a punto quemadita.',
      'Pesar la masa a 3 kg aproximadamente.',
      'Dar 3 pasadas con palote (palotear) y recortar las orillas.',
      'Cortar por la mitad a lo largo.',
      'Untar aceite a una punta y doblar en 3.',
      'Untar, poner azúcar estándar sobre la superficie y pegar.',
      'Hornear a 180°C durante 17 minutos.'
    ]
  },
  {
    id: 'rec-pan-caja-integral',
    pageNumber: 22,
    name: 'Pan de Caja Integral',
    subtitle: 'Pan de molde suave para sándwich con purpur o bizcocho blanco',
    category: 'Salado',
    yieldDesc: 'Moldes de pan de caja con tapa',
    bakingTemp: 200,
    bakingTime: '25 min',
    technique: 'Horneado cerrado sin abrir la puerta para evitar colapso',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina de trigo', amount: 1, unit: 'kg' },
      { name: 'Purpur (o sustituir por bizcocho para pan blanco)', amount: 200, unit: 'grs' },
      { name: 'Margarina azul', amount: 100, unit: 'grs' },
      { name: 'Azúcar', amount: 100, unit: 'grs' },
      { name: 'Sal', amount: 10, unit: 'grs' },
      { name: 'Levadura', amount: 25, unit: 'grs' },
      { name: 'Mejorante', amount: 10, unit: 'grs' },
      { name: 'Agua', amount: 600, unit: 'ml' }
    ],
    procedureSteps: [
      'Amasar harina, purpur, margarina azul, azúcar, sal, levadura, mejorante y los 600 ml de agua hasta lograr masa elástica.',
      'Dividir en tantos según el tamaño de los moldes de pan de caja.',
      'Enrollar en cilindros y colocar dentro de los moldes engrasados.',
      'Pintar con brocha la parte superior.',
      'Fermentar hasta que la masa alcance 1 cm antes del borde del molde.',
      'Tapar los moldes y hornear a 200°C por 25 minutos.',
      'Regla de oro del taller: Cocerlo sin abrir el horno para nada, porque se chupa.',
      'Variante: Para pan blanco de caja, cambiar el purpur por 200 grs de masa de bizcocho.'
    ]
  },
  {
    id: 'rec-pan-canela',
    pageNumber: 23,
    name: 'Pan de Canela',
    subtitle: 'Especialidad aromática con masa de bizcocho, canela y manteca',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 tanda cortada a un tanto',
    bakingTemp: 180,
    bakingTime: '17 min',
    technique: 'Incorporación de manteca en marcha',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Masa de bizcocho', amount: 1.5, unit: 'kg' },
      { name: 'Canela molida', amount: 70, unit: 'grs' },
      { name: 'Harina blanca', amount: 500, unit: 'grs' },
      { name: 'Azúcar', amount: 100, unit: 'grs' },
      { name: 'Manteca vegetal (agregar en marcha)', amount: 300, unit: 'grs' },
      { name: 'Agua', amount: 100, unit: 'ml' }
    ],
    procedureSteps: [
      'Revolver la masa de bizcocho con los 70 grs de canela, harina blanca y los 100 grs de azúcar.',
      'Con la máquina en marcha, agregar los 300 grs de manteca vegetal hasta absorber.',
      'Agregar los 100 ml de agua para hidratar.',
      'Cortar las piezas a 1 tanto uniforme.',
      'Fermentar y hornear a 180°C durante 17 minutos.'
    ]
  },
  {
    id: 'rec-pan-manteca',
    pageNumber: 24,
    name: 'Pan de Manteca',
    subtitle: 'Pan tradicional suave con sabor a manteca quemada en 3ra velocidad',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 tanda tradicional',
    bakingTemp: 200,
    bakingTime: '13 min',
    technique: 'Batidora de alta velocidad (quemar en 3era)',
    defaultImage: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina blanca', amount: 1800, unit: 'grs' },
      { name: 'Sal', amount: 20, unit: 'grs' },
      { name: 'Azúcar', amount: 250, unit: 'grs' },
      { name: 'Levadura', amount: 70, unit: 'grs' },
      { name: 'Agua', amount: 900, unit: 'ml' },
      { name: 'Manteca vegetal', amount: 800, unit: 'grs' },
      { name: 'Aceite vegetal', amount: 20, unit: 'ml', notes: '(1 chorrito)' }
    ],
    procedureSteps: [
      'Revolver harina blanca, sal, azúcar, levadura y los 900 ml de agua.',
      'En la batidora integrar los 800 grs de manteca vegetal y el chorrito de aceite (20 ml).',
      'Quemar la masa en 3.ª velocidad hasta lograr una textura lisa y sedosa.',
      'Porcionar, formar las piezas de pan de manteca, fermentar y hornear a 200°C por 13 minutos.'
    ]
  },
  {
    id: 'rec-pan-muerto',
    pageNumber: 25,
    name: 'Pan de Muerto',
    subtitle: 'Tradición mexicana con aroma a azahar, mantequilla y canillas',
    category: 'Bizcocho y Dulce',
    yieldDesc: 'Tanda festiva de temporada',
    bakingTemp: 180,
    bakingTime: '17 min',
    technique: 'Amasado de enriquecimiento y formación manual de canillas/huesos',
    defaultImage: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina preparada para pan de muerto', amount: 5, unit: 'kg' },
      { name: 'Huevo fresco', amount: 1.5, unit: 'lt' },
      { name: 'Margarina azul', amount: 1, unit: 'kg' },
      { name: 'Leche entera', amount: 2, unit: 'lt' },
      { name: 'Levadura fresca', amount: 1, unit: 'kg' }
    ],
    procedureSteps: [
      'Poner en la amasadora la harina preparada con la leche y el huevo.',
      'Incorporar la margarina azul y la levadura fresca.',
      'Amasar hasta lograr una liga resistente que permita boleo suave.',
      'Pesar las porciones y apartar una porción de masa para las canillas y bolitas (huesos).',
      'Colocar las canillas cruzadas y la bolita al centro sobre cada pan.',
      'Fermentar hasta doblar su volumen.',
      'Hornear a 180°C durante 17 minutos.',
      'Al salir del horno, barnizar generosamente con mantequilla derretida y espolvorear con azúcar blanca refinada.'
    ]
  },
  {
    id: 'rec-pan-espanol',
    pageNumber: 26,
    name: 'Pan Español',
    subtitle: 'Pan blanco con masa de bolillo enriquecida, mantequilla nona y vapor',
    category: 'Salado',
    yieldDesc: 'Bastón de 4 kilos cortado a 1 tanto',
    bakingTemp: 220,
    bakingTime: '15 min (con 4 seg de vapor)',
    hasSteam: true,
    technique: 'Bastón de masa y vapor al entrar al horno',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Masa de bolillo', amount: 3.4, unit: 'kg' },
      { name: 'Mantequilla nona', amount: 100, unit: 'grs' },
      { name: 'Azúcar', amount: 125, unit: 'grs' },
      { name: 'Harina de trigo', amount: 1, unit: 'kg' }
    ],
    procedureSteps: [
      'Mezclar los 3.400 kg de masa de bolillo con la mantequilla nona, azúcar y 1 kg de harina.',
      'Amasar hasta compactar un bastón de 4 kilos.',
      'Cortar a 1 tanto uniforme.',
      'Dar forma de pan español, colocar en charolas y fermentar.',
      'Hornear a 220°C durante 15 minutos aplicando 4 segundos de vapor de caldera.'
    ]
  },
  {
    id: 'rec-piedra',
    pageNumber: 27,
    name: 'Piedra de Chocolate y Nuez',
    subtitle: 'Reaprovechamiento tradicional de migajón con cocoa, canela y nuez',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 tanda de piedras tradicionales',
    bakingTemp: 200,
    bakingTime: '20 min',
    technique: 'Batido con pala de migajón e integración sin ligar',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Pan de migajón', amount: 3, unit: 'kg', group: '1. Base Migajón' },
      { name: 'Harina de trigo', amount: 1.4, unit: 'kg', group: '2. Secos y Sabor' },
      { name: 'Azúcar', amount: 600, unit: 'grs', group: '2. Secos y Sabor' },
      { name: 'Mantequilla', amount: 600, unit: 'grs', group: '2. Secos y Sabor' },
      { name: 'Nuez picada', amount: 100, unit: 'grs', group: '2. Secos y Sabor' },
      { name: 'Polvo para hornear (Royal)', amount: 50, unit: 'grs', group: '2. Secos y Sabor' },
      { name: 'Canela en polvo', amount: 30, unit: 'grs', group: '2. Secos y Sabor' },
      { name: 'Cocoa pura', amount: 80, unit: 'grs', group: '2. Secos y Sabor' },
      { name: 'Huevos', amount: 9, unit: 'piezas', group: '3. Líquidos' },
      { name: 'Leche', amount: 1, unit: 'lt', group: '3. Líquidos' }
    ],
    procedureSteps: [
      'Batir con pala los 3 kg de pan de migajón hasta deshacer.',
      'Integrar y batir la harina, azúcar, mantequilla, nuez picada, royal, canela y cocoa.',
      'Añadir los 9 huevos y el litro de leche.',
      'Integrar sin ligar durante solo 2 minutos para evitar textura chiclosa.',
      'Porcionar montículos rústicos sobre charolas engrasadas.',
      'Hornear a 200°C por 20 minutos hasta que estén firmes por fuera y suaves por dentro.'
    ]
  },
  {
    id: 'rec-polvoron-amarillo',
    pageNumber: 28,
    name: 'Polvorón Amarillo',
    subtitle: 'Polvorón tradicional arenoso con toque de naranja y craquelado',
    category: 'Galletas y Polvorones',
    yieldDesc: '1 charola de polvorones craquelados',
    bakingTemp: 200,
    bakingTime: '17 min',
    technique: 'Cremado sin fatigar la masa',
    defaultImage: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Manteca vegetal', amount: 1, unit: 'kg', group: '1. Cremar' },
      { name: 'Azúcar', amount: 1, unit: 'kg', group: '1. Cremar' },
      { name: 'Harina de trigo', amount: 1800, unit: 'grs', group: '2. Agregar' },
      { name: 'Huevos', amount: 4, unit: 'piezas', group: '2. Agregar' },
      { name: 'Polvo para hornear (Royal)', amount: 80, unit: 'grs', group: '2. Agregar' },
      { name: 'Color amarillo huevo', amount: 1, unit: 'pizca', group: '2. Agregar' },
      { name: 'Esencia de naranja', amount: 100, unit: 'ml', group: '2. Agregar' },
      { name: 'Bicarbonato (Carbonato)', amount: 20, unit: 'grs', group: '2. Agregar' }
    ],
    procedureSteps: [
      'Cremar 1 kg de manteca con 1 kg de azúcar.',
      'Agregar la harina, los 4 huevos, royal, la pizca de color amarillo huevo, la esencia de naranja y los 20 grs de carbonato.',
      'Regla del taller: No fatigar (revolver únicamente hasta que junte la masa sin desarrollar gluten).',
      'Formar bolas, aplastar ligeramente y colocar en charolas.',
      'Hornear a 200°C durante 17 minutos para obtener el craquelado característico.'
    ]
  },
  {
    id: 'rec-polvoron-cacahuate',
    pageNumber: 29,
    name: 'Polvorón de Cacahuate',
    subtitle: 'Polvorón con cacahuate tostado molido y azúcar glas',
    category: 'Galletas y Polvorones',
    yieldDesc: 'Tanda de polvorón de cacahuate',
    bakingTemp: 190,
    bakingTime: '20 min',
    technique: 'Cremado suave e integración en frío',
    defaultImage: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Azúcar glas', amount: 2, unit: 'kg', group: '1. Cremar' },
      { name: 'Manteca vegetal', amount: 2, unit: 'kg', group: '1. Cremar' },
      { name: 'Cacahuate tostado picado o molido', amount: 700, unit: 'grs', group: '2. Integrar' },
      { name: 'Harina de trigo', amount: 2.5, unit: 'kg', group: '2. Integrar' }
    ],
    procedureSteps: [
      'Cremar los 2 kg de azúcar glas con los 2 kg de manteca en batidora hasta esponjar.',
      'Integrar los 700 grs de cacahuate y los 2.5 kg de harina con movimientos envolventes.',
      'Porcionar los polvorones en bolitas compactadas suavemente.',
      'Hornear a 190°C por 20 minutos.',
      'Dejar enfriar en charola antes de tocar para evitar que se desmoronen.'
    ]
  },
  {
    id: 'rec-polvoron-ruso',
    pageNumber: 30,
    name: 'Polvorón Ruso',
    subtitle: 'Polvorón fino elaborado con mantequilla, margarina y yemas de huevo',
    category: 'Galletas y Polvorones',
    yieldDesc: '1 tanda de polvorón tipo pasta',
    bakingTemp: 180,
    bakingTime: '20 min',
    technique: 'Medio cremado, emulsión de yemas y tipo pasta',
    defaultImage: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Margarina', amount: 700, unit: 'grs', group: '1. Medio Cremar' },
      { name: 'Mantequilla', amount: 700, unit: 'grs', group: '1. Medio Cremar' },
      { name: 'Azúcar refinada', amount: 600, unit: 'grs', group: '2. Incorporar y Batir' },
      { name: 'Yemas de huevo', amount: 100, unit: 'ml', group: '3. Emulsión' },
      { name: 'Harina de trigo', amount: 2, unit: 'kg', group: '4. Pasta Final' },
      { name: 'Polvo para hornear (Royal)', amount: 40, unit: 'grs', group: '4. Pasta Final' }
    ],
    procedureSteps: [
      'Medio cremar la margarina y la mantequilla.',
      'Incorporar el azúcar refinada y batir.',
      'Incorporar los 100 ml de yema y dar 3 o 4 vueltas de batidora.',
      'Incorporar la harina con el royal hasta formar una masa tipo pasta.',
      'Porcionar, colocar en charolas y hornear a 180°C durante 20 minutos.'
    ]
  },
  {
    id: 'rec-puerquito',
    pageNumber: 31,
    name: 'Puerquito de Piloncillo',
    subtitle: 'Galleta tradicional mexicana en forma de cerdito con miel de piloncillo',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 charola de puerquitos',
    bakingTemp: 200,
    bakingTime: '13 min',
    technique: 'Batido corto en baja velocidad (1 ó 2 min máximo)',
    defaultImage: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina de trigo', amount: 2.5, unit: 'kg', group: '1. Batir' },
      { name: 'Manteca vegetal', amount: 500, unit: 'grs', group: '1. Batir' },
      { name: 'Bicarbonato (Carbonato)', amount: 40, unit: 'grs', group: '1. Batir' },
      { name: 'Polvo para hornear (Royal)', amount: 80, unit: 'grs', group: '1. Batir' },
      { name: 'Huevos', amount: 6, unit: 'piezas', group: '2. Integrar en baja' },
      { name: 'Miel de piloncillo espesa', amount: 1.5, unit: 'lt', group: '2. Integrar en baja' }
    ],
    procedureSteps: [
      'Poner en la batidora la harina, manteca, carbonato y royal.',
      'Agregar las 6 piezas de huevo y el litro y medio de miel de piloncillo.',
      'Integrar en primera o baja velocidad durante 1 ó 2 minutos máximo (no sobrebatir para que mantenga textura quebradiza).',
      'Extender la masa a 6 mm de grosor con palote sobre mesa enharinada.',
      'Cortar con el molde cortador de puerquito.',
      'Acomodar en charolas engrasadas y hornear a 200°C durante 13 minutos.'
    ]
  },
  {
    id: 'rec-remis',
    pageNumber: 32,
    name: 'Remis (Pan de Papa)',
    subtitle: 'Pan de papa suave y esponjoso para hamburguesa o bocadillo gourmet',
    category: 'Salado',
    yieldDesc: 'Hacer 2 recetas para 72 piezas exactas',
    bakingTemp: 205,
    bakingTime: '15 min',
    technique: 'Amasado hasta ligar, corte a un tanto y pinchado con palillo',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina de trigo', amount: 900, unit: 'grs' },
      { name: 'Masa de bizcocho', amount: 200, unit: 'grs' },
      { name: 'Margarina azul', amount: 100, unit: 'grs' },
      { name: 'Huevo fresco', amount: 1, unit: 'pieza' },
      { name: 'Azúcar', amount: 100, unit: 'grs' },
      { name: 'Sal', amount: 10, unit: 'grs' },
      { name: 'Levadura fresca', amount: 40, unit: 'grs' },
      { name: 'Mejorante', amount: 10, unit: 'grs' },
      { name: 'Agua', amount: 600, unit: 'ml' },
      { name: 'Leche Nido en polvo', amount: 50, unit: 'grs' }
    ],
    procedureSteps: [
      'Revolver todos los ingredientes en amasadora hasta ligar por completo.',
      'Reposar la masa 10 minutos cubierta con plástico.',
      'Cortar todo a un tanto uniforme (pesar para bollo estándar).',
      'Bolear y pinchar cada pieza con palillo en la parte superior.',
      'Fermentar hasta doblar su volumen.',
      'Hornear a 205°C durante 15 minutos.',
      'Nota de producción: Hacer 2 recetas para obtener 72 piezas exactas.'
    ]
  },
  {
    id: 'rec-salsa-fendu',
    pageNumber: 33,
    name: 'Salsa Fendú',
    subtitle: 'Salsa artesanal para pan salado relleno, baguettes y bocadillos',
    category: 'Especialidades',
    yieldDesc: '1 preparación para pan salado relleno',
    technique: 'Sofrito en aceite, molienda y sazonado en aceite de oliva',
    defaultImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Zanahoria', amount: 0.5, unit: 'kg', notes: '(1/2 kilo)', group: '1. Freír en aceite' },
      { name: 'Cebolla morada', amount: 1, unit: 'pieza', group: '1. Freír en aceite' },
      { name: 'Cebolla blanca', amount: 1, unit: 'pieza', group: '1. Freír en aceite' },
      { name: 'Jitomate maduro', amount: 0.5, unit: 'kg', notes: '(1/2 kilo)', group: '1. Freír en aceite' },
      { name: 'Finas hierbas secas', amount: 'Al gusto', unit: '', group: '2. Sazonar' },
      { name: 'Sal de grano', amount: 'Al gusto', unit: '', group: '2. Sazonar' },
      { name: 'Aceite de oliva extra virgen', amount: 'Al gusto', unit: '', group: '2. Sazonar' }
    ],
    procedureSteps: [
      'Picar y freír en aceite vegetal la zanahoria (1/2 kg), 1 cebolla morada, 1 cebolla blanca y el jitomate (1/2 kg) hasta ablandar y caramelizar.',
      'Pasar todo a la licuadora o molino y moler hasta obtener textura tersa.',
      'Regresar a la cacerola a fuego bajo con un buen chorro de aceite de oliva.',
      'Sazonar con finas hierbas y sal al gusto.',
      'Cocinar 5 minutos más a fuego suave y ¡Listo para usar en rellenos o servicio!'
    ]
  },
  {
    id: 'rec-yoyo',
    pageNumber: 34,
    name: 'Yoyo',
    subtitle: 'Bizcocho redondo suave unido en pares con mermelada y cremaquilla',
    category: 'Bizcocho y Dulce',
    yieldDesc: '1 tanda de yoyos rellenos',
    bakingTemp: 180,
    bakingTime: '15 min',
    technique: 'Cremado y batido hasta pasta casi líquida',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Margarina', amount: 800, unit: 'grs', group: '1. Cremar' },
      { name: 'Azúcar', amount: 700, unit: 'grs', group: '1. Cremar' },
      { name: 'Harina de trigo', amount: 2, unit: 'kg', group: '2. Integrar y Batir' },
      { name: 'Huevos frescos', amount: 8, unit: 'piezas', group: '2. Integrar y Batir' },
      { name: 'Polvo para hornear (Royal)', amount: 80, unit: 'grs', group: '2. Integrar y Batir' },
      { name: 'Leche entera', amount: 800, unit: 'ml', group: '2. Integrar y Batir' },
      { name: 'Esencia de vainilla', amount: 50, unit: 'ml', group: '2. Integrar y Batir' }
    ],
    procedureSteps: [
      'Cremar los 800 grs de margarina con los 700 grs de azúcar.',
      'Integrar y batir la harina, los 8 huevos, 80 grs de royal, 800 ml de leche y los 50 ml de vainilla hasta obtener una pasta casi líquida y uniforme.',
      'Duguear semiesferas en charolas con papel estrella dejando espacio entre sí.',
      'Hornear a 180°C durante 15 minutos.',
      'Dejar enfriar, untar mermelada de fresa o cremaquilla al centro y unir dos piezas formando el yoyo tradicional.',
      'Revolcar por azúcar fina o coco rallado al gusto.'
    ]
  },
  {
    id: 'rec-croissant-loma-linda',
    pageNumber: 35,
    name: 'Croissant Loma Linda',
    subtitle: 'Croissant hojaldrado fino con grasa Loma Linda y empaste de 300 g por kg de masa',
    category: 'Especialidades',
    baseKg: 2,
    yieldDesc: 'Tanda base de 2 kg de harina (~3.7 kg de masa base antes de empaste)',
    bakingTemp: 180,
    bakingTime: '18-20 min',
    technique: 'Amasado elástico, reposo en frío y empaste laminado de 300 grs por kilo de masa',
    defaultImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina de trigo', amount: 2, unit: 'kg', group: 'Masa Base' },
      { name: 'Sal fina', amount: 36, unit: 'grs', group: 'Masa Base' },
      { name: 'Azúcar estándar', amount: 240, unit: 'grs', group: 'Masa Base' },
      { name: 'Huevos frescos', amount: 4, unit: 'piezas', group: 'Masa Base' },
      { name: 'Leche entera', amount: 1200, unit: 'ml', group: 'Masa Base' },
      { name: 'Levadura fresca', amount: 40, unit: 'grs', group: 'Masa Base' },
      { name: 'Loma Linda (grasa/margarina)', amount: 240, unit: 'grs', group: 'Masa Base' },
      { name: 'Empaste Loma Linda', amount: 300, unit: 'grs', notes: '300 grs por cada kilo de masa pesada', group: 'Empaste' }
    ],
    procedureSteps: [
      'Colocar en la bati-amasadora los 2 kg de harina, los 36 grs de sal y los 240 grs de azúcar.',
      'Agregar los 4 huevos frescos, los 1200 ml de leche y los 40 grs de levadura fresca.',
      'Incorporar los 240 grs de Loma Linda y amasar hasta obtener una masa suave, homogénea y elástica con membrana desarrollada.',
      'Pesar la masa obtenida para calcular el empaste exacto: incorporar 300 grs de Loma Linda por cada kilo de masa pesada.',
      'Cubrir la masa con plástico y reposar en refrigeración de 30 a 45 minutos para enfriar y facilitar el laminado.',
      'Extender la masa fría en rectángulo, colocar el bloque de empaste al centro y cerrar las puntas.',
      'Dar las vueltas de laminado (vueltas sencillas y dobles) con reposo en frío de 20 minutos entre cada vuelta.',
      'Estirar a 3.5 - 4 mm de grosor, cortar los triángulos y enrollar desde la base hacia la punta formando los croissants.',
      'Colocar en charolas, fermentar en cámara tibia hasta doblar volumen, barnizar con huevo y hornear a 180°C durante 18 a 20 minutos.'
    ],
    notes: [
      'Empaste: 300 grs por cada kilo de masa pesada.',
      'Horneado sugerido: 180°C por 18 a 20 min.'
    ]
  },
  {
    id: 'rec-danes',
    pageNumber: 36,
    name: 'Danés',
    subtitle: 'Masa hojaldrada tradicional para cuernos, trenzas, regañadas y pan fino',
    category: 'Bizcocho y Dulce',
    baseKg: 8,
    yieldDesc: 'Tanda base de 8 kg de harina (~Paños de 4 kg de masa)',
    bakingTemp: 180,
    bakingTime: '17 min',
    technique: 'Amasado fino, paños de 4 kg con 250 g marg-manteq y empaste de 1 kg mantequilla Nona',
    defaultImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { name: 'Harina de trigo', amount: 8, unit: 'kg', group: 'Masa' },
      { name: 'Sal', amount: 120, unit: 'grs', group: 'Masa' },
      { name: 'Azúcar', amount: 2, unit: 'kg', group: 'Masa' },
      { name: 'Margarina danés', amount: 1, unit: 'kg', group: 'Masa' },
      { name: 'Mantequilla', amount: 1, unit: 'kg', group: 'Masa' },
      { name: 'Huevo fresco', amount: 2, unit: 'lts', group: 'Masa' },
      { name: 'Leche entera', amount: 2.5, unit: 'lts', group: 'Masa' },
      { name: 'Mejorante', amount: 50, unit: 'grs', group: 'Masa' },
      { name: 'Levadura fresca', amount: 80, unit: 'grs', group: 'Masa' },
      { name: 'Mantequilla Nona (Empaste)', amount: 1, unit: 'kg', notes: 'Empaste para 8 kg danés', group: 'Empaste y Paños' },
      { name: 'Margarina - Mantequilla para paños', amount: 250, unit: 'grs', notes: '250 grs por paño de 4 kg de masa', group: 'Empaste y Paños' }
    ],
    procedureSteps: [
      'En la revolvedora, colocar los 8 kg de harina, los 120 grs de sal, los 2 kg de azúcar y los 50 grs de mejorante.',
      'Añadir 1 kg de margarina danés, 1 kg de mantequilla, 2 litros de huevo y 2.5 litros de leche.',
      'Agregar los 80 grs de levadura y amasar a buena velocidad hasta conseguir una masa elástica, fina y bien acondicionada.',
      'Dividir la masa en paños de 4 kg para un manejo cómodo y profesional.',
      'Trabajar cada paño de 4 kg con 250 grs de margarina-mantequilla.',
      'Empaste: Para la masa base de 8 kg danés, utilizar 1 kg de mantequilla Nona.',
      'Laminar los paños aplicando el empaste y dando las vueltas de hojaldrado con reposo en frío entre cada doblez.',
      'Estirar y cortar para formar las piezas deseadas: cuernos daneses, trenzas, regañadas, orejas danesas o corbatas.',
      'Colocar en charolas y dejar fermentar hasta que esponjen adecuadamente.',
      'Hornear a 180°C durante exactamente 17 minutos hasta alcanzar un dorado perfecto y textura crujiente.'
    ],
    notes: [
      'Paños de 4 kg con 250 grs de margarina-mantequilla.',
      'Empaste: 8k danés con 1k mantequilla Nona.',
      'Hornear: 180°C por 17 minutos.'
    ]
  }
];

// Helper to save and load custom photos uploaded by the user
export function loadRecipeCustomPhotos(): Record<string, string> {
  try {
    const raw = localStorage.getItem('santafe_recipe_photos');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveRecipeCustomPhoto(recipeId: string, dataUrl: string): void {
  try {
    const photos = loadRecipeCustomPhotos();
    photos[recipeId] = dataUrl;
    localStorage.setItem('santafe_recipe_photos', JSON.stringify(photos));
  } catch (err) {
    console.error('Error saving recipe photo:', err);
  }
}

export function removeRecipeCustomPhoto(recipeId: string): void {
  try {
    const photos = loadRecipeCustomPhotos();
    delete photos[recipeId];
    localStorage.setItem('santafe_recipe_photos', JSON.stringify(photos));
  } catch {}
}
