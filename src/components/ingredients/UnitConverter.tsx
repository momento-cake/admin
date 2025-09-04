'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IngredientUnit } from '@/types/ingredient';
import { convertUnits, getUnitDisplayName } from '@/lib/ingredients';
import { ArrowRightLeft, Calculator, Scale, Info, BookOpen } from 'lucide-react';

// Common ingredient conversions for baking
const INGREDIENT_CONVERSIONS: Record<string, Record<string, string>> = {
  'Farinha de trigo': {
    '1 xícara': '120g',
    '1 colher de sopa': '7.5g',
    '1 colher de chá': '2.5g'
  },
  'Açúcar refinado': {
    '1 xícara': '200g',
    '1 colher de sopa': '12.5g',
    '1 colher de chá': '4g'
  },
  'Açúcar mascavo': {
    '1 xícara': '213g',
    '1 colher de sopa': '13g',
    '1 colher de chá': '4.3g'
  },
  'Manteiga': {
    '1 xícara': '227g',
    '1 colher de sopa': '14g',
    '1 colher de chá': '5g'
  },
  'Leite': {
    '1 xícara': '240ml',
    '1 colher de sopa': '15ml',
    '1 colher de chá': '5ml'
  },
  'Mel': {
    '1 xícara': '340g',
    '1 colher de sopa': '21g',
    '1 colher de chá': '7g'
  },
  'Cacau em pó': {
    '1 xícara': '85g',
    '1 colher de sopa': '5g',
    '1 colher de chá': '1.7g'
  }
};

const RECIPE_SCALING_RATIOS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

interface RecipeScaling {
  ingredient: string;
  originalAmount: number;
  originalUnit: IngredientUnit;
  scalingFactor: number;
}

export function UnitConverter() {
  const [value, setValue] = useState<number>(1);
  const [fromUnit, setFromUnit] = useState<IngredientUnit>(IngredientUnit.KILOGRAM);
  const [toUnit, setToUnit] = useState<IngredientUnit>(IngredientUnit.GRAM);
  const [selectedIngredient, setSelectedIngredient] = useState<string>('Farinha de trigo');
  const [scalingFactor, setScalingFactor] = useState<number>(1);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeScaling[]>([]);
  
  const result = convertUnits(fromUnit, toUnit, value);

  const handleValueChange = (newValue: string) => {
    const numValue = parseFloat(newValue);
    setValue(isNaN(numValue) ? 0 : numValue);
  };

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const addRecipeIngredient = () => {
    if (value > 0) {
      const newIngredient: RecipeScaling = {
        ingredient: `Ingrediente ${recipeIngredients.length + 1}`,
        originalAmount: value,
        originalUnit: fromUnit,
        scalingFactor: scalingFactor
      };
      setRecipeIngredients([...recipeIngredients, newIngredient]);
    }
  };

  const removeRecipeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const getUnitsByType = (type: 'weight' | 'volume' | 'count'): IngredientUnit[] => {
    switch (type) {
      case 'weight':
        return [IngredientUnit.KILOGRAM, IngredientUnit.GRAM, IngredientUnit.POUND, IngredientUnit.OUNCE];
      case 'volume':
        return [IngredientUnit.LITER, IngredientUnit.MILLILITER, IngredientUnit.CUP, IngredientUnit.TABLESPOON, IngredientUnit.TEASPOON];
      case 'count':
        return [IngredientUnit.UNIT];
      default:
        return Object.values(IngredientUnit);
    }
  };

  const isConversionPossible = (from: IngredientUnit, to: IngredientUnit): boolean => {
    const weightUnits = getUnitsByType('weight');
    const volumeUnits = getUnitsByType('volume');
    const countUnits = getUnitsByType('count');
    
    const fromIsWeight = weightUnits.includes(from);
    const fromIsVolume = volumeUnits.includes(from);
    const fromIsCount = countUnits.includes(from);
    
    const toIsWeight = weightUnits.includes(to);
    const toIsVolume = volumeUnits.includes(to);
    const toIsCount = countUnits.includes(to);
    
    return (fromIsWeight && toIsWeight) || (fromIsVolume && toIsVolume) || (fromIsCount && toIsCount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Conversor Avançado de Unidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Conversão Básica</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
            <TabsTrigger value="scaling">Escalar Receita</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From */}
              <div className="space-y-2">
                <Label>De:</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="Quantidade"
                    step="0.01"
                    min="0"
                  />
                  <Select value={fromUnit} onValueChange={(value) => setFromUnit(value as IngredientUnit)}>
                    <SelectTrigger className="min-w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <optgroup label="Peso">
                        {getUnitsByType('weight').map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getUnitDisplayName(unit)}
                          </SelectItem>
                        ))}
                      </optgroup>
                      <optgroup label="Volume">
                        {getUnitsByType('volume').map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getUnitDisplayName(unit)}
                          </SelectItem>
                        ))}
                      </optgroup>
                      <optgroup label="Contagem">
                        {getUnitsByType('count').map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getUnitDisplayName(unit)}
                          </SelectItem>
                        ))}
                      </optgroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* To */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Para:</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={swapUnits}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={isConversionPossible(fromUnit, toUnit) ? result.toFixed(4) : 'N/A'}
                    readOnly
                    className="bg-muted"
                  />
                  <Select value={toUnit} onValueChange={(value) => setToUnit(value as IngredientUnit)}>
                    <SelectTrigger className="min-w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <optgroup label="Peso">
                        {getUnitsByType('weight').map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getUnitDisplayName(unit)}
                          </SelectItem>
                        ))}
                      </optgroup>
                      <optgroup label="Volume">
                        {getUnitsByType('volume').map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getUnitDisplayName(unit)}
                          </SelectItem>
                        ))}
                      </optgroup>
                      <optgroup label="Contagem">
                        {getUnitsByType('count').map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getUnitDisplayName(unit)}
                          </SelectItem>
                        ))}
                      </optgroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Validation */}
            {!isConversionPossible(fromUnit, toUnit) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Não é possível converter entre diferentes tipos de unidades (peso, volume, contagem). 
                  Selecione unidades do mesmo tipo.
                </AlertDescription>
              </Alert>
            )}

            {/* Conversion Display */}
            {isConversionPossible(fromUnit, toUnit) && (
              <div className="bg-muted p-4 rounded-md text-center">
                <p className="text-lg font-medium">
                  {value} {getUnitDisplayName(fromUnit)} = {result.toFixed(4)} {getUnitDisplayName(toUnit)}
                </p>
              </div>
            )}

            {/* Common Conversions Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-2">Conversões de Peso:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 1 kg = 1.000 g</li>
                  <li>• 1 lb = 453,59 g</li>
                  <li>• 1 oz = 28,35 g</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Conversões de Volume:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 1 L = 1.000 ml</li>
                  <li>• 1 xícara = 240 ml</li>
                  <li>• 1 colher de sopa = 15 ml</li>
                  <li>• 1 colher de chá = 5 ml</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o Ingrediente:</Label>
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(INGREDIENT_CONVERSIONS).map((ingredient) => (
                      <SelectItem key={ingredient} value={ingredient}>
                        {ingredient}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale className="h-4 w-4" />
                    {selectedIngredient}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(INGREDIENT_CONVERSIONS[selectedIngredient] || {}).map(([measure, weight]) => (
                      <div key={measure} className="text-center p-3 bg-muted rounded-md">
                        <p className="font-medium">{measure}</p>
                        <p className="text-sm text-muted-foreground">=</p>
                        <p className="text-lg font-bold text-momento-primary">{weight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  <strong>Dica:</strong> Essas conversões são aproximadas e podem variar dependendo da densidade 
                  e forma do ingrediente. Para maior precisão, use uma balança digital.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="scaling" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fator de Escala:</Label>
                  <Select value={scalingFactor.toString()} onValueChange={(value) => setScalingFactor(parseFloat(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPE_SCALING_RATIOS.map((ratio) => (
                        <SelectItem key={ratio} value={ratio.toString()}>
                          {ratio}x {ratio < 1 ? `(${(ratio * 100).toFixed(0)}%)` : ratio > 1 ? `(+${((ratio - 1) * 100).toFixed(0)}%)` : '(original)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Adicionar Ingrediente:</Label>
                  <Button onClick={addRecipeIngredient} className="w-full" disabled={value <= 0}>
                    Adicionar {value} {getUnitDisplayName(fromUnit)}
                  </Button>
                </div>
              </div>

              {recipeIngredients.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Receita Escalada ({scalingFactor}x)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recipeIngredients.map((ingredient, index) => {
                        const scaledAmount = ingredient.originalAmount * scalingFactor;
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div className="flex-1">
                              <p className="font-medium">{ingredient.ingredient}</p>
                              <p className="text-sm text-muted-foreground">
                                {ingredient.originalAmount} {getUnitDisplayName(ingredient.originalUnit)} → 
                                <span className="font-medium text-momento-primary ml-1">
                                  {scaledAmount.toFixed(2)} {getUnitDisplayName(ingredient.originalUnit)}
                                </span>
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRecipeIngredient(index)}
                            >
                              ×
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {recipeIngredients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum ingrediente adicionado ainda.</p>
                  <p className="text-sm">Use a conversão básica para definir quantidades e adicione aqui.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}