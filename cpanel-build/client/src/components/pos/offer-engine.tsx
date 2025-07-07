import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Percent, Star, Clock, Tag } from "lucide-react";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  barcode?: string;
}

interface ApplicableOffer {
  id: number;
  name: string;
  description?: string;
  offerType: string;
  discountValue: string;
  minPurchaseAmount?: string;
  maxDiscountAmount?: string;
  buyQuantity?: number;
  getQuantity?: number;
  calculatedDiscount: number;
  priority: number;
}

interface OfferEngineProps {
  cartItems: CartItem[];
  customerId?: number;
  onOffersCalculated: (offers: ApplicableOffer[], totalDiscount: number) => void;
}

export function OfferEngine({ cartItems, customerId, onOffersCalculated }: OfferEngineProps) {
  const [applicableOffers, setApplicableOffers] = useState<ApplicableOffer[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);

  // Fetch active offers
  const { data: offers = [] } = useQuery({
    queryKey: ['/api/offers', { active: true }],
    queryFn: async () => {
      const response = await fetch('/api/offers?active=true');
      if (!response.ok) throw new Error('Failed to fetch offers');
      return response.json();
    }
  });

  // Fetch customer loyalty info if customerId is provided
  const { data: customerLoyalty } = useQuery({
    queryKey: ['/api/customer-loyalty', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const response = await fetch(`/api/customer-loyalty/${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch customer loyalty');
      return response.json();
    },
    enabled: !!customerId
  });

  useEffect(() => {
    calculateApplicableOffers();
  }, [cartItems, offers, customerLoyalty]);

  const calculateApplicableOffers = () => {
    if (!cartItems.length || !offers.length) {
      setApplicableOffers([]);
      setTotalDiscount(0);
      onOffersCalculated([], 0);
      return;
    }

    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const validOffers: ApplicableOffer[] = [];

    offers.forEach((offer: any) => {
      const calculatedOffer = evaluateOffer(offer, cartItems, cartTotal, customerLoyalty);
      if (calculatedOffer) {
        validOffers.push(calculatedOffer);
      }
    });

    // Sort by priority and discount amount
    validOffers.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.calculatedDiscount - a.calculatedDiscount;
    });

    // Apply best combination of offers (simple greedy approach)
    const appliedOffers = selectBestOffers(validOffers, cartTotal);
    const total = appliedOffers.reduce((sum, offer) => sum + offer.calculatedDiscount, 0);

    setApplicableOffers(appliedOffers);
    setTotalDiscount(total);
    onOffersCalculated(appliedOffers, total);
  };

  const evaluateOffer = (offer: any, items: CartItem[], cartTotal: number, loyalty?: any): ApplicableOffer | null => {
    const minPurchase = offer.minPurchaseAmount ? parseFloat(offer.minPurchaseAmount) : 0;
    
    // Check minimum purchase requirement
    if (cartTotal < minPurchase) return null;

    // Check time validity
    if (offer.validFrom && new Date(offer.validFrom) > new Date()) return null;
    if (offer.validTo && new Date(offer.validTo) < new Date()) return null;

    let discount = 0;

    switch (offer.offerType) {
      case 'percentage':
        discount = cartTotal * (parseFloat(offer.discountValue) / 100);
        if (offer.maxDiscountAmount) {
          discount = Math.min(discount, parseFloat(offer.maxDiscountAmount));
        }
        break;

      case 'flat_amount':
        discount = parseFloat(offer.discountValue);
        break;

      case 'buy_x_get_y':
        discount = calculateBuyXGetYDiscount(offer, items);
        break;

      case 'category_based':
        discount = calculateCategoryDiscount(offer, items);
        break;

      case 'loyalty_points':
        if (!loyalty || !customerLoyalty) return null;
        const pointsThreshold = offer.pointsThreshold ? parseInt(offer.pointsThreshold) : 0;
        if (parseInt(loyalty.availablePoints || '0') >= pointsThreshold) {
          discount = parseFloat(offer.discountValue);
        }
        break;

      default:
        return null;
    }

    if (discount <= 0) return null;

    return {
      id: offer.id,
      name: offer.name,
      description: offer.description,
      offerType: offer.offerType,
      discountValue: offer.discountValue,
      minPurchaseAmount: offer.minPurchaseAmount,
      maxDiscountAmount: offer.maxDiscountAmount,
      buyQuantity: offer.buyQuantity,
      getQuantity: offer.getQuantity,
      calculatedDiscount: discount,
      priority: offer.priority || 999
    };
  };

  const calculateBuyXGetYDiscount = (offer: any, items: CartItem[]): number => {
    const buyQty = offer.buyQuantity || 1;
    const getQty = offer.getQuantity || 1;
    
    // Find applicable items
    let applicableItems = items;
    if (offer.applicableProducts) {
      const productIds = offer.applicableProducts.split(',').map((id: string) => parseInt(id.trim()));
      applicableItems = items.filter(item => productIds.includes(item.id));
    }

    let totalDiscount = 0;
    applicableItems.forEach(item => {
      const eligibleSets = Math.floor(item.quantity / buyQty);
      const freeItems = eligibleSets * getQty;
      totalDiscount += freeItems * item.price;
    });

    return totalDiscount;
  };

  const calculateCategoryDiscount = (offer: any, items: CartItem[]): number => {
    if (!offer.applicableCategories) return 0;
    
    const categories = offer.applicableCategories.split(',').map((cat: string) => cat.trim());
    const applicableItems = items.filter(item => 
      item.category && categories.includes(item.category)
    );

    const categoryTotal = applicableItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    let discount = categoryTotal * (parseFloat(offer.discountValue) / 100);
    if (offer.maxDiscountAmount) {
      discount = Math.min(discount, parseFloat(offer.maxDiscountAmount));
    }

    return discount;
  };

  const selectBestOffers = (offers: ApplicableOffer[], cartTotal: number): ApplicableOffer[] => {
    // Simple implementation: take non-conflicting offers with highest discount
    const selected: ApplicableOffer[] = [];
    let remainingTotal = cartTotal;

    for (const offer of offers) {
      if (offer.calculatedDiscount <= remainingTotal) {
        selected.push(offer);
        remainingTotal -= offer.calculatedDiscount;
      }
    }

    return selected;
  };

  const getOfferIcon = (offerType: string) => {
    switch (offerType) {
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'flat_amount': return <Tag className="h-4 w-4" />;
      case 'buy_x_get_y': return <Gift className="h-4 w-4" />;
      case 'loyalty_points': return <Star className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getOfferTypeLabel = (offerType: string) => {
    switch (offerType) {
      case 'percentage': return 'Percentage';
      case 'flat_amount': return 'Flat Amount';
      case 'buy_x_get_y': return 'Buy X Get Y';
      case 'loyalty_points': return 'Loyalty';
      case 'time_based': return 'Time-based';
      case 'category_based': return 'Category';
      default: return 'Special';
    }
  };

  if (!applicableOffers.length) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No applicable offers</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Gift className="h-5 w-5" />
          Applied Offers
          <Badge variant="secondary" className="ml-auto">
            Total: ₹{totalDiscount.toFixed(2)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {applicableOffers.map((offer) => (
          <div key={offer.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                {getOfferIcon(offer.offerType)}
              </div>
              <div>
                <h4 className="font-medium text-sm">{offer.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getOfferTypeLabel(offer.offerType)}
                  </Badge>
                  {offer.description && (
                    <p className="text-xs text-gray-600 truncate max-w-40">
                      {offer.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-600">
                -₹{offer.calculatedDiscount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {offer.offerType === 'percentage' && `${offer.discountValue}% off`}
                {offer.offerType === 'flat_amount' && `₹${offer.discountValue} off`}
                {offer.offerType === 'buy_x_get_y' && `${offer.buyQuantity}+${offer.getQuantity} deal`}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}