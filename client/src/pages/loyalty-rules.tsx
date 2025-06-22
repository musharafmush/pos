import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Calculator, TrendingUp, Gift, CheckCircle, Edit3, Save, X } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const loyaltyRuleSchema = z.object({
  pointsPerRupee: z.string().min(1, "Points per rupee is required"),
  minimumPurchase: z.string().min(1, "Minimum purchase amount is required"),
  maxPointsPerTransaction: z.string().optional(),
  description: z.string().optional()
});

type LoyaltyRuleData = z.infer<typeof loyaltyRuleSchema>;

export default function LoyaltyRules() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Current loyalty rule (hardcoded as per requirement)
  const currentRule = {
    pointsPerRupee: 0.01,
    minimumPurchase: 1,
    maxPointsPerTransaction: undefined as number | undefined,
    description: "Standard loyalty program: 1 point per ₹100 spent"
  };

  const ruleForm = useForm<LoyaltyRuleData>({
    resolver: zodResolver(loyaltyRuleSchema),
    defaultValues: {
      pointsPerRupee: currentRule.pointsPerRupee.toString(),
      minimumPurchase: currentRule.minimumPurchase.toString(),
      maxPointsPerTransaction: "",
      description: currentRule.description
    }
  });

  const handleSaveRule = async (data: LoyaltyRuleData) => {
    try {
      // In a real implementation, this would save to backend
      console.log('Saving loyalty rule:', data);
      
      toast({
        title: "Loyalty Rule Updated",
        description: "Your loyalty program settings have been saved successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error Saving Rule",
        description: "Failed to update loyalty program settings",
        variant: "destructive",
      });
    }
  };

  // Example calculations based on the rule
  const exampleCalculations = [
    { amount: 1, points: 0.01 },
    { amount: 10, points: 0.10 },
    { amount: 100, points: 1.00 },
    { amount: 250, points: 2.50 },
    { amount: 275, points: 2.75 },
    { amount: 500, points: 5.00 },
    { amount: 1000, points: 10.00 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Customer Loyalty Rules
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Manage and configure your customer loyalty program rules and point calculations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Rule Configuration */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gift className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-xl">Loyalty Program Rule</CardTitle>
                    <CardDescription className="text-blue-100">
                      Current point calculation settings
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-700">₹{currentRule.pointsPerRupee}</div>
                      <div className="text-sm text-green-600">Points per Rupee</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-700">₹{currentRule.minimumPurchase}</div>
                      <div className="text-sm text-blue-600">Minimum Purchase</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">Rule Description</h4>
                    <p className="text-gray-600">{currentRule.description}</p>
                  </div>

                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Active Rule</span>
                  </div>
                </div>
              ) : (
                <Form {...ruleForm}>
                  <form onSubmit={ruleForm.handleSubmit(handleSaveRule)} className="space-y-4">
                    <FormField
                      control={ruleForm.control}
                      name="pointsPerRupee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points per Rupee</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            How many points customers earn per rupee spent
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={ruleForm.control}
                      name="minimumPurchase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Purchase Amount (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ruleForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rule Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Describe your loyalty program"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Example Calculations */}
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <Calculator className="h-6 w-6" />
                <div>
                  <CardTitle className="text-xl">Point Calculations</CardTitle>
                  <CardDescription className="text-purple-100">
                    Examples based on current rule
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-600 pb-2 border-b">
                  <div>Sale Amount</div>
                  <div>Points Earned</div>
                </div>
                
                {exampleCalculations.map((calc, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 py-2 hover:bg-gray-50 rounded-lg px-2">
                    <div className="font-medium text-gray-700">₹{calc.amount}</div>
                    <div className="font-bold text-purple-600">{calc.points.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Key Benefits
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Simple 1:100 ratio (₹100 = 1 point)</li>
                  <li>• Easy customer understanding</li>
                  <li>• Encourages repeat purchases</li>
                  <li>• Scalable reward system</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rule Summary */}
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
            <CardTitle className="text-xl flex items-center gap-3">
              <CheckCircle className="h-6 w-6" />
              Active Loyalty Rule Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">0.01</div>
                <div className="text-sm text-gray-600">Points per ₹1</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">1.00</div>
                <div className="text-sm text-gray-600">Points per ₹100</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">2.50</div>
                <div className="text-sm text-gray-600">Points per ₹250</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">10.00</div>
                <div className="text-sm text-gray-600">Points per ₹1000</div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                ✅ ₹1 sale = 0.01 points • ₹100 sale = 1 point • ₹250 sale = 2.5 points
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}