import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TagIcon, 
  PrinterIcon, 
  SettingsIcon, 
  ImageIcon,
  PaletteIcon,
  LayoutIcon,
  CrownIcon,
  ShieldIcon,
  TrendingUpIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  StarIcon
} from "lucide-react";

export default function LabelPrintingHub() {
  const labelSystems = [
    {
      id: "basic",
      title: "Basic Labels",
      description: "Simple, essential label printing with core product information",
      route: "/print-labels",
      icon: TagIcon,
      color: "from-gray-500 to-gray-700",
      features: ["Product Name", "Price", "SKU", "Basic Barcode"],
      badge: "Standard",
      badgeColor: "secondary"
    },
    {
      id: "enhanced",
      title: "Enhanced Templates",
      description: "Advanced template system with database integration and customizable layouts",
      route: "/print-labels-enhanced",
      icon: LayoutIcon,
      color: "from-blue-500 to-blue-700",
      features: ["Template Management", "Database Storage", "Print Job Tracking", "Advanced Layouts"],
      badge: "Enhanced",
      badgeColor: "default"
    },
    {
      id: "image-based",
      title: "Image-Based Labels",
      description: "Labels matching your uploaded reference image format with M MARI branding style",
      route: "/image-based-labels",
      icon: ImageIcon,
      color: "from-green-500 to-green-700",
      features: ["2×5 Grid Layout", "M MARI Branding", "Image Matching", "Professional Barcodes"],
      badge: "Custom Format",
      badgeColor: "default",
      highlight: true
    },
    {
      id: "professional",
      title: "Professional Labels",
      description: "Fully customized professional-grade labels with advanced branding and layout options",
      route: "/professional-labels",
      icon: CrownIcon,
      color: "from-purple-500 to-purple-700",
      features: ["6 Layout Styles", "Custom Branding", "Advanced Typography", "Retail Features", "Compliance Elements"],
      badge: "Professional",
      badgeColor: "default",
      premium: true
    }
  ];

  const features = [
    {
      icon: PaletteIcon,
      title: "Custom Branding",
      description: "Add your company colors, logos, and branding elements"
    },
    {
      icon: LayoutIcon,
      title: "Multiple Layouts",
      description: "Choose from modern, classic, minimal, premium, retail, and industrial styles"
    },
    {
      icon: ShieldIcon,
      title: "Compliance Ready",
      description: "Include regulatory information, certifications, and environmental icons"
    },
    {
      icon: TrendingUpIcon,
      title: "Retail Features",
      description: "Discount badges, stock status, category tags, and customer engagement elements"
    }
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <PrinterIcon className="h-10 w-10 text-blue-600" />
            Label Printing Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete label printing solutions for your business - from basic labels to fully customized professional designs
          </p>
        </div>

        {/* Feature Overview */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-center text-blue-900">Complete Label Printing Ecosystem</CardTitle>
            <CardDescription className="text-center text-blue-700">
              Professional-grade label printing with comprehensive customization options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-blue-900">{feature.title}</h3>
                  <p className="text-sm text-blue-700">{feature.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Label Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {labelSystems.map((system) => (
            <Card 
              key={system.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                system.highlight ? 'ring-2 ring-green-300 bg-green-50' : 
                system.premium ? 'ring-2 ring-purple-300 bg-purple-50' : ''
              }`}
            >
              {system.premium && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900">
                    <CrownIcon className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${system.color} rounded-lg flex items-center justify-center`}>
                      <system.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {system.title}
                        {system.highlight && <StarIcon className="h-4 w-4 text-green-600" />}
                      </CardTitle>
                      <Badge variant={system.badgeColor as any}>{system.badge}</Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {system.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Features List */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Key Features:</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {system.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircleIcon className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Button */}
                <Button 
                  className={`w-full bg-gradient-to-r ${system.color} hover:opacity-90 transition-opacity`}
                  onClick={() => window.location.href = system.route}
                >
                  Access {system.title}
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Setup Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Quick Setup Guide
            </CardTitle>
            <CardDescription>
              Get started with label printing in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold">Choose Your System</h3>
                <p className="text-sm text-gray-600">Select the label printing system that best fits your needs</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold">Configure Templates</h3>
                <p className="text-sm text-gray-600">Create and customize label templates with your branding</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold">Print Labels</h3>
                <p className="text-sm text-gray-600">Select products and print professional labels instantly</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">Latest Updates</CardTitle>
            <CardDescription className="text-purple-700">
              New features and improvements to the label printing system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-purple-900">Professional Labels System</p>
                  <p className="text-sm text-purple-700">Complete professional-grade label printing with 6 layout styles and advanced customization</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-purple-900">Enhanced Barcode Display</p>
                  <p className="text-sm text-purple-700">Improved barcode rendering with realistic patterns and deterministic generation</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-purple-900">Image-Based Label Matching</p>
                  <p className="text-sm text-purple-700">Labels that perfectly match your reference image format with M MARI branding style</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}