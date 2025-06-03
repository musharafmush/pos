
import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { 
  Banknote, 
  XIcon, 
  PlusIcon, 
  MinusIcon, 
  Calculator,
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  UserIcon
} from "lucide-react";

interface CashTransaction {
  id: string;
  type: 'add' | 'remove';
  amount: number;
  reason: string;
  timestamp: Date;
  user: string;
}

interface POSRegisterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCashAmount?: number;
}

export function POSRegister({ isOpen, onOpenChange, initialCashAmount = 0 }: POSRegisterProps) {
  const [cashInHand, setCashInHand] = useState(initialCashAmount);
  const [newAmount, setNewAmount] = useState("");
  const [reason, setReason] = useState("");
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    const amount = parseFloat(newAmount);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this cash transaction",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Update cash in hand
      setCashInHand(amount);

      // Add transaction record
      const transaction: CashTransaction = {
        id: Date.now().toString(),
        type: amount > cashInHand ? 'add' : 'remove',
        amount: Math.abs(amount - cashInHand),
        reason: reason.trim(),
        timestamp: new Date(),
        user: 'Admin' // You can get this from auth context
      };

      setTransactions(prev => [transaction, ...prev]);

      toast({
        title: "Cash Register Updated",
        description: `Cash in hand updated to ${formatCurrency(amount)}`,
      });

      // Reset form
      setNewAmount("");
      setReason("");
      onOpenChange(false);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cash register",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCash = (amount: number) => {
    const newTotal = cashInHand + amount;
    setCashInHand(newTotal);
    
    const transaction: CashTransaction = {
      id: Date.now().toString(),
      type: 'add',
      amount,
      reason: `Quick add ${formatCurrency(amount)}`,
      timestamp: new Date(),
      user: 'Admin'
    };
    
    setTransactions(prev => [transaction, ...prev]);
    
    toast({
      title: "Cash Added",
      description: `Added ${formatCurrency(amount)} to register`,
    });
  };

  const handleRemoveCash = (amount: number) => {
    if (amount > cashInHand) {
      toast({
        title: "Insufficient Cash",
        description: "Cannot remove more cash than available",
        variant: "destructive"
      });
      return;
    }

    const newTotal = cashInHand - amount;
    setCashInHand(newTotal);
    
    const transaction: CashTransaction = {
      id: Date.now().toString(),
      type: 'remove',
      amount,
      reason: `Quick remove ${formatCurrency(amount)}`,
      timestamp: new Date(),
      user: 'Admin'
    };
    
    setTransactions(prev => [transaction, ...prev]);
    
    toast({
      title: "Cash Removed",
      description: `Removed ${formatCurrency(amount)} from register`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Banknote className="h-6 w-6 text-green-600" />
            POS Register
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Cash Display */}
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5" />
                Current Cash in Hand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600 mb-2">
                {formatCurrency(cashInHand)}
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                Last updated: {new Date().toLocaleTimeString()}
              </Badge>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium text-green-700 mb-2 block">Add Cash</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCash(100)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      ₹100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCash(500)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      ₹500
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCash(1000)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      ₹1,000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCash(2000)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      ₹2,000
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-red-700 mb-2 block">Remove Cash</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCash(100)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <MinusIcon className="h-3 w-3 mr-1" />
                      ₹100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCash(500)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <MinusIcon className="h-3 w-3 mr-1" />
                      ₹500
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCash(1000)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <MinusIcon className="h-3 w-3 mr-1" />
                      ₹1,000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCash(2000)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <MinusIcon className="h-3 w-3 mr-1" />
                      ₹2,000
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Set Cash Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cashAmount" className="text-sm font-medium">
                  Cash In Hand
                </Label>
                <Input
                  id="cashAmount"
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="Enter amount in rupees"
                  className="mt-1 text-lg"
                  step="0.01"
                />
              </div>
              
              <div>
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason
                </Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for cash update (e.g., Opening balance, Bank deposit)"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {transaction.type === 'add' ? (
                          <TrendingUpIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDownIcon className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{transaction.reason}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {transaction.user} • {transaction.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        transaction.type === 'add' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'add' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            <XIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !newAmount || !reason}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <DollarSignIcon className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component
export function POSRegisterTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
      >
        <Banknote className="h-4 w-4" />
        Cash Register
      </Button>
      
      <POSRegister 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        initialCashAmount={0}
      />
    </>
  );
}
