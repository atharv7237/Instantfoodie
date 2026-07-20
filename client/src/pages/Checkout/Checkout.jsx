import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineHome,
  HiOutlineCreditCard,
  HiOutlineBanknotes,
  HiOutlineDevicePhoneMobile,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineMapPin,
} from "react-icons/hi2";
import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { placeOrder } from "../../services/order.service";

const paymentOptions = [
  {
    key: "COD",
    label: "Cash on Delivery",
    icon: <HiOutlineBanknotes size={20} />,
  },
  { key: "UPI", label: "UPI", icon: <HiOutlineDevicePhoneMobile size={20} /> },
  {
    key: "CARD",
    label: "Credit / Debit Card",
    icon: <HiOutlineCreditCard size={20} />,
  },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartCount, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [hasSeededFromProfile, setHasSeededFromProfile] = useState(false);

  const [newAddress, setNewAddress] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // GPS "use my current location" state
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  const deliveryFee = cartItems.length > 0 ? 30 : 0;
  const grandTotal = cartTotal + deliveryFee;

  useEffect(() => {
    if (user && !hasSeededFromProfile) {
      if (user.address && user.phone) {
        const seeded = {
          id: "profile-default",
          label: "Saved Address",
          fullName: user.fullName || "",
          phone: user.phone || "",
          address: user.address || "",
        };
        setSavedAddresses([seeded]);
        setSelectedAddressId(seeded.id);
      } else {
        setIsAddingNew(true);
      }
      setHasSeededFromProfile(true);
    }
  }, [user, hasSeededFromProfile]);

  const handleNewAddressChange = (field) => (e) => {
    setNewAddress((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validateNewAddress = () => {
    const errors = {};
    if (!newAddress.fullName.trim()) errors.fullName = "Full name is required";
    if (!newAddress.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(newAddress.phone.trim()))
      errors.phone = "Enter a valid 10-digit phone number";
    if (!newAddress.address.trim())
      errors.address = "Delivery address is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAddress = () => {
    if (!validateNewAddress()) return;

    if (editingAddressId) {
      setSavedAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddressId
            ? { id: editingAddressId, ...newAddress }
            : a,
        ),
      );
      setSelectedAddressId(editingAddressId);
    } else {
      const tempId = `local-${Date.now()}`;
      setSavedAddresses((prev) => [...prev, { id: tempId, ...newAddress }]);
      setSelectedAddressId(tempId);
    }

    setIsAddingNew(false);
    setEditingAddressId(null);
    setNewAddress({ label: "Home", fullName: "", phone: "", address: "" });
    setFormErrors({});
    setLocationError("");
  };

  const handleEditAddress = (addr) => {
    setNewAddress({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      address: addr.address,
    });
    setEditingAddressId(addr.id);
    setIsAddingNew(true);
    setFormErrors({});
    setLocationError("");
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingAddressId(null);
    setNewAddress({ label: "Home", fullName: "", phone: "", address: "" });
    setFormErrors({});
    setLocationError("");
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } },
          );
          const data = await response.json();

          const formattedAddress =
            data?.display_name || `Lat: ${latitude}, Lng: ${longitude}`;

          setNewAddress((prev) => ({ ...prev, address: formattedAddress }));
        } catch (err) {
          console.log("Reverse geocoding failed:", err);
          setLocationError(
            "Could not fetch address for your location. Please enter it manually.",
          );
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.log("Geolocation error:", error);
        setLocationError(
          "Could not access your location. Please allow location permission or enter address manually.",
        );
        setLocating(false);
      },
    );
  };

  const handleDeleteAddress = (id) => {
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
    if (selectedAddressId === id) {
      setSelectedAddressId(null);
    }
  };

  const selectedAddress = savedAddresses.find(
    (a) => a.id === selectedAddressId,
  );

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;

    if (!selectedAddress) {
      setOrderError(
        "Please select or add a delivery address before placing the order.",
      );
      return;
    }

    setPlacingOrder(true);
    setOrderError("");

    try {
      const deliveryAddress = `${selectedAddress.fullName}, ${selectedAddress.address}, Phone: ${selectedAddress.phone}`;

      const orderData = {
        restaurantId: cartItems[0].foodItemId.restaurantId,
        items: cartItems.map((item) => ({
          foodItemId: item.foodItemId._id,
          quantity: item.quantity,
        })),
        deliveryAddress,
        paymentMethod,
      };

      await placeOrder(orderData);
      await clearCart();
      navigate("/order");
    } catch (error) {
      setOrderError(
        error?.response?.data?.message || "Order failed. Please try again.",
      );
      console.log("Full Error:", error);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar cartCount={cartCount} />
        <div className="w-[95%] max-w-3xl mx-auto mt-12 pb-20 px-2 sm:px-4 text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Your cart is empty
          </h2>
          <p className="text-neutral-400 mb-6">
            Add some items to your cart before checking out.
          </p>
          <button
            onClick={() => navigate("/home")}
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black px-6 py-3 rounded-2xl transition-all active:scale-95"
          >
            Browse dishes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar cartCount={cartCount} />

      <div className="w-[95%] max-w-6xl mx-auto mt-12 pb-20 px-2 sm:px-4">
        <div className="mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Checkout
          </h2>
          <p className="text-neutral-400 mt-2">
            Choose a delivery address and payment method.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-neutral-800 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <HiOutlineHome className="text-amber-500" size={22} />
                  <h3 className="text-lg font-black text-white">
                    Delivery Address
                  </h3>
                </div>

                {!isAddingNew && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    <HiOutlinePlus size={16} />
                    Add New Address
                  </button>
                )}
              </div>

              {savedAddresses.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`relative flex items-start gap-3 w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-neutral-800 bg-zinc-950 hover:border-neutral-700"
                      }`}
                    >
                      <span
                        className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedAddressId === addr.id
                            ? "border-amber-500"
                            : "border-neutral-700"
                        }`}
                      >
                        {selectedAddressId === addr.id && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-amber-500">
                            {addr.label}
                          </span>
                        </div>
                        <p className="text-white font-bold mt-1">
                          {addr.fullName}
                        </p>
                        <p className="text-neutral-400 text-sm mt-0.5">
                          {addr.address}
                        </p>
                        <p className="text-neutral-400 text-sm mt-0.5">
                          Phone: {addr.phone}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAddress(addr);
                          }}
                          className="text-neutral-500 hover:text-amber-500 transition-colors"
                        >
                          <HiOutlinePencil size={18} />
                        </span>

                        {addr.id !== "profile-default" && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(addr.id);
                            }}
                            className="text-neutral-500 hover:text-red-400 transition-colors"
                          >
                            <HiOutlineTrash size={18} />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isAddingNew && (
                <div className="flex flex-col gap-4 border-t border-neutral-800 pt-4 mt-1">
                  {editingAddressId && (
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-500">
                      Editing address
                    </p>
                  )}

                  <div>
                    <label className="text-sm text-neutral-400 mb-1.5 block">
                      Label
                    </label>
                    <div className="flex gap-2">
                      {["Home", "Office", "Other"].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setNewAddress((prev) => ({ ...prev, label }))
                          }
                          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                            newAddress.label === label
                              ? "border-amber-500 bg-amber-500/10 text-white"
                              : "border-neutral-800 bg-zinc-950 text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-neutral-400 mb-1.5 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newAddress.fullName}
                      onChange={handleNewAddressChange("fullName")}
                      placeholder="Your full name"
                      className="w-full bg-zinc-950 border border-neutral-800 focus:border-amber-500 outline-none rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 transition-colors"
                    />
                    {formErrors.fullName && (
                      <p className="text-red-400 text-xs mt-1.5">
                        {formErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-neutral-400 mb-1.5 block">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={newAddress.phone}
                      onChange={handleNewAddressChange("phone")}
                      placeholder="10-digit mobile number"
                      className="w-full bg-zinc-950 border border-neutral-800 focus:border-amber-500 outline-none rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 transition-colors"
                    />
                    {formErrors.phone && (
                      <p className="text-red-400 text-xs mt-1.5">
                        {formErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm text-neutral-400 block">
                        Delivery Address
                      </label>
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={locating}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors disabled:opacity-60"
                      >
                        <HiOutlineMapPin size={14} />
                        {locating ? "Locating..." : "Use my current location"}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={newAddress.address}
                      onChange={handleNewAddressChange("address")}
                      placeholder="House no, street, area, city, pincode"
                      className="w-full bg-zinc-950 border border-neutral-800 focus:border-amber-500 outline-none rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 resize-none transition-colors"
                    />
                    {formErrors.address && (
                      <p className="text-red-400 text-xs mt-1.5">
                        {formErrors.address}
                      </p>
                    )}
                    {locationError && (
                      <p className="text-red-400 text-xs mt-1.5">
                        {locationError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-5 py-2.5 rounded-xl transition-colors"
                    >
                      {editingAddressId ? "Update Address" : "Save Address"}
                    </button>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        className="bg-zinc-950 border border-neutral-700 hover:border-neutral-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-neutral-800 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <HiOutlineCreditCard className="text-amber-500" size={22} />
                <h3 className="text-lg font-black text-white">
                  Payment Method
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {paymentOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPaymentMethod(option.key)}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border transition-colors text-left ${
                      paymentMethod === option.key
                        ? "border-amber-500 bg-amber-500/10 text-white"
                        : "border-neutral-800 bg-zinc-950 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <span
                      className={
                        paymentMethod === option.key
                          ? "text-amber-500"
                          : "text-neutral-500"
                      }
                    >
                      {option.icon}
                    </span>
                    <span className="font-semibold">{option.label}</span>
                    <span
                      className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === option.key
                          ? "border-amber-500"
                          : "border-neutral-700"
                      }`}
                    >
                      {paymentMethod === option.key && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative rounded-3xl p-[1.5px] overflow-hidden group h-fit sticky top-28 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_30px_60px_-10px_rgba(245,158,11,0.2)] transition-all duration-500">
            <div className="absolute inset-0 z-0 bg-[conic-gradient(from_0deg,transparent_40%,#f59e0b_50%,transparent_60%)] opacity-50 group-hover:opacity-100 transition-opacity duration-500 scale-110 animate-streak-active pointer-events-none" />

            <div className="relative z-10 bg-[#121212]/95 backdrop-blur-xl rounded-[23px] p-6">
              <h3 className="text-lg font-black text-white mb-5">
                Order Summary
              </h3>

              <div className="flex flex-col gap-3 mb-5 max-h-64 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between text-sm gap-3"
                  >
                    <span className="text-neutral-300 truncate">
                      {item.foodItemId.name}{" "}
                      <span className="text-neutral-500">x{item.quantity}</span>
                    </span>
                    <span className="text-white font-semibold shrink-0">
                      ₹{(item.foodItemId.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-neutral-800 mb-5" />

              <div className="flex items-center justify-between text-sm text-neutral-400 mb-3">
                <span>Subtotal ({cartCount} items)</span>
                <span className="text-white font-semibold">
                  ₹{cartTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-neutral-400 mb-5">
                <span>Delivery fee</span>
                <span className="text-white font-semibold">
                  ₹{deliveryFee.toFixed(2)}
                </span>
              </div>

              <hr className="border-neutral-800 mb-5" />

              <div className="flex items-center justify-between text-base font-black text-white mb-6">
                <span>Total</span>
                <span className="text-amber-500 text-xl">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {orderError && (
                <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm font-semibold text-center">
                  {orderError}
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-3.5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] transition-all active:scale-95 disabled:opacity-60"
              >
                {placingOrder ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
