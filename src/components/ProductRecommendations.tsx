"use client";

import { useState } from "react";
import { Star, TrendingUp, DollarSign, Award, Check, ExternalLink } from "lucide-react";
import type { QueryResult, ProductDisplay, TopPick } from "@/types/index";

interface ProductRecommendationsProps {
  result: QueryResult;
}

export function ProductRecommendations({ result }: ProductRecommendationsProps) {
  const { products, topRated, bestValue, editorsChoice, summary, totalProducts, totalReviews, averagePrice } = result;

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-3 sm:pb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900">AI Shopping Recommendations</h2>
        <p className="text-xs sm:text-sm text-gray-500">
          {totalProducts} products • {totalReviews} reviews analyzed • ₹{averagePrice} avg price
          {result.cached && <span className="ml-2 text-blue-500">(cached)</span>}
        </p>
        {summary && (
          <p className="text-xs sm:text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">{summary}</p>
        )}
      </div>

      {/* Top Picks */}
      <div className="space-y-3 sm:space-y-4">
        {topRated && (
          <TopPickCard
            product={topRated}
            icon={<Star className="w-3 h-3 sm:w-4 sm:h-4" />}
            label="Top Rated"
            color="yellow"
          />
        )}
        
        {bestValue && bestValue.asin !== topRated?.asin && (
          <TopPickCard
            product={bestValue}
            icon={<DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />}
            label="Best Value"
            color="green"
          />
        )}
        
        {editorsChoice && editorsChoice.asin !== topRated?.asin && editorsChoice.asin !== bestValue?.asin && (
          <TopPickCard
            product={editorsChoice}
            icon={<Award className="w-3 h-3 sm:w-4 sm:h-4" />}
            label="Editor's Choice"
            color="purple"
          />
        )}
      </div>

      {/* All Products - Single Card Per Screen */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">All Products</h3>
        <div className="flex flex-col gap-3 sm:gap-4">
          {products.map((product, index) => (
            <ProductCard key={product.asin || `product-${index}`} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TopPickCard({
  product,
  icon,
  label,
  color,
}: {
  product: TopPick;
  icon: React.ReactNode;
  label: string;
  color: "yellow" | "green" | "purple";
}) {
  const colorClasses = {
    yellow: "bg-yellow-50 border-yellow-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
  };

  const badgeClasses = {
    yellow: "bg-yellow-400 text-yellow-900",
    green: "bg-green-400 text-green-900",
    purple: "bg-purple-400 text-purple-900",
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg border p-3 sm:p-4`}>
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        <div className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold ${badgeClasses[color]}`}>
          {label}
        </div>
        <span className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1">
          {icon}
        </span>
      </div>
      
      <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2">{product.title}</h3>
      
      <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
        <span className="text-base sm:text-lg font-bold text-amazon-dark">
          {product.price !== null ? `₹${product.price.toLocaleString()}` : "N/A"}
        </span>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-xs sm:text-sm font-medium">{product.rating}</span>
        </div>
      </div>
      
      <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3 line-clamp-2">{product.reason}</p>
      
      {product.url && (
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-amazon-blue hover:text-amazon-dark font-medium"
        >
          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
          View on Amazon
        </a>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ProductDisplay }) {
  const hasValidUrl = product.url && 
    product.url !== 'https://amazon.com' &&
    product.url.startsWith('https://www.amazon.');
  
  // Check for valid image URL
  const hasValidImage = product.imageUrl && 
    product.imageUrl.trim() !== '' && 
    !product.imageUrl.includes('placeholder');
  
  const [imageError, setImageError] = useState(false);

  return (
    <a
      href={hasValidUrl ? product.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`group ${hasValidUrl ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 sm:hover:-translate-y-1 h-full flex flex-col">
        {/* Image Container */}
        <div className="relative w-full h-36 sm:h-48 md:h-56 bg-gray-50 flex items-center justify-center overflow-hidden">
          {hasValidImage && !imageError ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
              onError={() => {
                console.log(`[ProductCard] Image failed to load: ${product.imageUrl}`);
                setImageError(true);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] sm:text-[10px] text-gray-400">No image</span>
            </div>
          )}
          {product.tag && (
            <span className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold shadow-sm ${
              product.tag === 'Top Rated' ? 'bg-yellow-400 text-yellow-900' :
              product.tag === 'Best Value' ? 'bg-green-400 text-green-900' :
              'bg-purple-400 text-purple-900'
            }`}>
              {product.tag}
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="p-2 sm:p-3 flex-1 flex flex-col">
          <h4 className="font-medium text-gray-900 text-xs sm:text-sm md:text-base line-clamp-2 mb-1.5 sm:mb-2 flex-1 leading-tight">
            {product.title}
          </h4>
          
          <div className="flex items-center justify-between mt-auto">
            <span className="font-bold text-amazon-dark text-xs sm:text-sm">
              {product.price !== null ? `₹${product.price.toLocaleString()}` : "N/A"}
            </span>
            <div className="flex items-center gap-1 bg-gray-50 px-1 sm:px-1.5 py-0.5 rounded">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-700">{product.rating}</span>
            </div>
          </div>
          
          <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1">
            {product.reviewCount > 0 ? `${product.reviewCount.toLocaleString()} reviews analyzed` : 'Reviews not available'}
          </span>
          
          {/* Pros */}
          {product.insights.pros.length > 0 && (
            <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
              {product.insights.pros.slice(0, 2).map((pro, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[9px] sm:text-[10px] text-green-700">
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  <span className="line-clamp-1">{pro}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
