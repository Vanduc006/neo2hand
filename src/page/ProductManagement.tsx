import { useState } from "react";
import SupportScreen from "./SupportScreen";
import CategoriesPage from "@/components/CategoriesPage";
import ProductsPage from "@/components/ProductsPage";

const ProductManagement = () => {
  const [currentTab, setCurrentTab] = useState<string>("Supports");

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Tabs Menu */}
      <div className="flex gap-2 overflow-x-auto text-white ml-4 mt-4">
        {["Categories", "Products", "Orders", "Supports"].map((tab) => (
          <div
            key={tab}
            onClick={() => setCurrentTab(tab)}
            className={`p-2 px-5 rounded-md cursor-pointer ${
              currentTab === tab ? "bg-blue-800" : "bg-blue-500"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-3 rounded-md flex-1 overflow-y-auto bg-gray-200">
        {currentTab === "Categories" && <CategoriesPage />}
        {currentTab === "Products" && <ProductsPage />}
        {currentTab === "Orders" && <div className="h-full p-4">Orders content</div>}
        {currentTab === "Supports" && 
            <div className="h-full">
                <SupportScreen/>
            </div>
        }
      </div>
    </div>
  );
};

export default ProductManagement;
