"use client";

import { useState } from "react";
import { Star, ExternalLink, Check } from "lucide-react";

interface Product {
  asin: string;
  title: string;
  price: number | null;
  imageUrl: string;
  url: string;
  rating: number;
  reviewCount: number;
  tag?: string;
  insights?: {
    pros: string[];
    cons: string[];
  };
}

interface ProductCarouselProps {
  products: Product[];
  topRated?: Product;
  bestValue?: Product;
  editorsChoice?: Product;
}

export function ProductCarousel({ products, topRated, bestValue, editorsChoice }: ProductCarouselProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-2 font-medium">
        Found {products.length} products
      </p>
      
      {/* Horizontal scroll container */}
      <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-hide" 
           style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {products.map((product, index) => (
          <ProductCard 
            key={product.asin || `product-${index}`} 
            product={product}
            isTopRated={topRated?.asin === product.asin}
            isBestValue={bestValue?.asin === product.asin}
            isEditorsChoice={editorsChoice?.asin === product.asin}
          />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ 
  product, 
  isTopRated, 
  isBestValue, 
  isEditorsChoice 
}: { 
  product: Product; 
  isTopRated?: boolean;
  isBestValue?: boolean;
  isEditorsChoice?: boolean;
}) {
  const hasValidUrl = product.url && product.url.startsWith('https://www.amazon.');
  const hasValidImage = product.imageUrl && 
    product.imageUrl.trim() !== '' && 
    !product.imageUrl.includes('placeholder');
  
  const [imageError, setImageError] = useState(false);

  // Determine badge
  let badge = null;
  if (isTopRated) {
    badge = <span className="bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Top Rated</span>;
  } else if (isBestValue) {
    badge = <span className="bg-green-400 text-green-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Best Value</span>;
  } else if (isEditorsChoice) {
    badge = <span className="bg-purple-400 text-purple-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Editor&apos;s Choice</span>;
  } else if (product.tag) {
    badge = <span className="bg-blue-400 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">{product.tag}</span>;
  }

  return (
    <a
      href={hasValidUrl ? product.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-40 snap-start group cursor-pointer"
    >
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 h-full flex flex-col">
        {/* Image Container */}
        <div className="relative w-full h-28 bg-gray-50 flex items-center justify-center overflow-hidden">
          {hasValidImage && !imageError ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100">
              <svg className="w-6 h-6 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] text-gray-400">No image</span>
            </div>
          )}
          
          {/* Badge */}
          {badge && (
            <div className="absolute top-1.5 left-1.5">
              {badge}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-2 flex-1 flex flex-col">
          <h4 className="font-medium text-gray-900 text-xs line-clamp-2 mb-1.5 flex-1 leading-tight">
            {product.title}
          </h4>
          
          <div className="flex items-center justify-between mt-auto">
            <span className="font-bold text-amazon-dark text-xs">
              {product.price !== null ? `₹${product.price.toLocaleString()}` : "N/A"}
            </span>
            <div className="flex items-center gap-1 bg-gray-50 px-1 py-0.5 rounded">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] font-medium text-gray-700">{product.rating}</span>
            </div>
          </div>
          
          {/* Pros - show first one */}
          {product.insights?.pros && product.insights.pros.length > 0 && (
            <div className="mt-1.5 flex items-start gap-1">
              <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-[9px] text-green-700 line-clamp-1">
                {product.insights.pros[0]}
              </span>
            </div>
          )}
          
          {/* Amazon link indicator */}
          {hasValidUrl && (
            <div className="mt-1.5 flex items-center gap-1 text-[9px] text-blue-600">
              <ExternalLink className="w-3 h-3" />
              <span>View on Amazon</span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
