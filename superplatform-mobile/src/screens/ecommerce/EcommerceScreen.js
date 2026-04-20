import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, FlatList, Image, Alert, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { COLORS } from '../../lib/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { fmt } from '../../utils/helpers';
import { Card, Badge, Chip, StarRating, SectionHeader, EmptyState } from '../../components/ui';
import PaymentSheet from '../../components/payment/PaymentSheet';

const TABS = ['Shop', 'Second-Hand', 'Cart', 'Orders'];
const SHOP_CATS = ['All', 'Electronics', 'Fashion', 'Gaming', 'Computers', 'Home'];
const USED_CATS = ['All', 'Phones', 'Laptops', 'TVs', 'Electronics', 'Shoes', 'Furniture', 'Other'];
const CONDITIONS = ['All', 'New', 'Used', 'Refurbished'];
const PLATFORM_FEE = 0.05; // 5%

// No demo fallback data — products come from Supabase only

const BADGE_COLORS = { HOT: '#ef4444', SALE: COLORS.brand, NEW: '#10b981', LOCAL: '#8b5cf6', LUXURY: '#f59e0b' };

// ─── Commission preview helper ──────────────────────────────────────────────
function commissionBreakdown(price) {
  const p = parseFloat(price) || 0;
  const fee = Math.round(p * PLATFORM_FEE * 100) / 100;
  const earn = Math.round((p - fee) * 100) / 100;
  return { price: p, fee, earn };
}

export default function EcommerceScreen({ navigation }) {
      
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
const { user } = useAuthStore();
  const { items: cartItems, addItem, removeItem, updateQty, total } = useCartStore();

  const [tab, setTab] = useState('Shop');
  const [condition, setCondition] = useState('All');  // All / New / Used / Refurbished
  const [selCat, setSelCat] = useState('All');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [usedItems, setUsedItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Sell listing form state
  const [showSellForm, setShowSellForm] = useState(false);
  const [listing, setListing] = useState({
    title: '', description: '', price: '', category: 'Electronics',
    condition: 'used', location: '',
  });

  // Escrow payment state
  const [escrowPayment, setEscrowPayment] = useState(null); // { product, amount }
  const [escrowDone, setEscrowDone] = useState({}); // { [productId]: true }

  // Cart checkout payment
  const [cartPayment, setCartPayment] = useState(null);

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const sellerType = user?.user_metadata?.role === 'provider' ? 'provider' : 'customer';
  const sellerLabel = sellerType === 'provider' ? 'Store Vendor' : 'Individual Seller';
  const breakdown = commissionBreakdown(listing.price);

  // ── Data loaders ────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .not('condition', 'in', '(used,refurbished)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (!error && data?.length) {
        setProducts(data.map(d => ({
          id: d.id, name: d.title || d.name, price: d.price,
          cat: d.category || 'Electronics',
          rating: d.rating || 4.5, reviews: d.total_reviews || 0,
          img: d.images?.[0] || PRODUCTS_FB[0].img,
          badge: d.badge || null,
        })));
      }
    } catch { /* empty — no fallback */ }
  }, []);

  const loadUsedItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, profiles!products_seller_id_fkey(full_name, location)')
        .in('condition', ['used', 'refurbished'])
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (!error && data?.length) {
        setUsedItems(data.map(d => ({
          ...d,
          title: d.title || d.name,
          seller: d.profiles?.full_name || 'Seller',
          location: d.location || d.profiles?.location || 'Ghana',
        })));
      }
    } catch { /* fallback */ }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setOrders(data || []);
    } catch { }
  }, [user]);

  useEffect(() => {
    loadProducts();
    loadUsedItems();
    loadOrders();
  }, [loadProducts, loadUsedItems, loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadUsedItems(), loadOrders()]);
    setRefreshing(false);
  };

  // ── Filtered lists ───────────────────────────────────────────────────────
  const filteredNew = useMemo(() => {
    if (condition === 'Used' || condition === 'Refurbished') return [];
    return products.filter(p =>
      (selCat === 'All' || p.cat === selCat) &&
      (search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [products, condition, selCat, search]);

  const filteredUsed = useMemo(() => {
    if (condition === 'New') return [];
    return usedItems.filter(p => {
      const matchCat = selCat === 'All' || p.category === selCat;
      const matchSearch = (p.title || '').toLowerCase().includes(search.toLowerCase());
      const matchCond = condition === 'All'
        || (condition === 'Used' && p.condition === 'used')
        || (condition === 'Refurbished' && p.condition === 'refurbished');
      return matchCat && matchSearch && matchCond;
    });
  }, [usedItems, condition, selCat, search]);

  // ── Image picker ─────────────────────────────────────────────────────────
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setListing(l => ({ ...l, images: [...(l.images || []), ...result.assets.map(a => a.uri)].slice(0, 5) }));
    }
  };

  const uploadImage = async (uri) => {
    const ext = uri.split('.').pop() || 'jpg';
    const path = `products/${user.id}/${Date.now()}.${ext}`;
    const res = await fetch(uri);
    const blob = await res.blob();
    const { error } = await supabase.storage.from('products').upload(path, blob, { contentType: 'image/' + ext });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
    return publicUrl;
  };

  // ── Submit listing (with auth guard) ─────────────────────────────────────
  const submitListing = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'You must be signed in to list items for sale.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('AuthModal') },
      ]);
      return;
    }
    if (!listing.title || !listing.price) {
      Alert.alert('Missing Info', 'Please fill in the title and price.'); return;
    }
    if (!listing.location) {
      Alert.alert('Missing Info', 'Please enter your location.'); return;
    }
    try {
      const imageUrls = listing.images?.length
        ? await Promise.all(listing.images.map(uploadImage))
        : [];

      const { error } = await supabase.from('products').insert({
        seller_id: user.id,
        seller_type: sellerType,
        title: listing.title,
        description: listing.description,
        price: parseFloat(listing.price),
        category: listing.category,
        condition: listing.condition,
        location: listing.location,
        images: imageUrls,
        commission_rate: PLATFORM_FEE,
        status: 'pending', // requires admin approval
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      Alert.alert(
        'Submitted for Review',
        `Your listing will go live once approved.\n\nYou will receive ${fmt(breakdown.earn)} after the platform fee (${fmt(breakdown.fee)}) when sold.`
      );
      setShowSellForm(false);
      setListing({ title: '', description: '', price: '', category: 'Electronics', condition: 'used', location: '' });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Escrow Buy Now ────────────────────────────────────────────────────────
  const handleBuyNow = (product) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to purchase items.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('AuthModal') },
      ]);
      return;
    }
    setEscrowPayment({ product, amount: product.price });
  };

  const handleEscrowSuccess = async (result, product) => {
    try {
      const ref = result?.reference || ('mobile-' + Date.now());
      await supabase.rpc('create_marketplace_order', {
        p_buyer_id: user.id,
        p_product_id: product.id,
        p_amount: product.price,
        p_payment_ref: ref,
      });
      // Mark escrow done
      setEscrowDone(d => ({ ...d, [product.id]: true }));
      setEscrowPayment(null);
      Alert.alert(
        'Purchase Secured!',
        'Your payment is held in escrow. The seller will ship your item. Confirm delivery to release payment to the seller.'
      );
      loadOrders();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to complete escrow purchase.');
    }
  };

  // ── Cart checkout ────────────────────────────────────────────────────────
  const checkout = () => {
    if (!cartItems.length) return;
    if (!user) { navigation.navigate('AuthModal'); return; }
    setCartPayment({ name: 'Cart Checkout (' + cartCount + ' items)', price: total() });
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen}>

      {/* ── TABS ─────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            {t === 'Cart' && cartCount > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── SHOP TAB ──────────────────────────────────────────────────── */}
      {tab === 'Shop' && (
        <FlatList
          key={condition} // re-render grid when switching between 1 and 2 cols
          data={condition === 'New' || condition === 'All' ? filteredNew : filteredUsed}
          numColumns={2}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 8 }}>
              {/* Search */}
              <View style={styles.searchRow}>
                <Feather name="search" size={15} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products, brands…"
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              {/* Condition filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                {CONDITIONS.map(c => (
                  <TouchableOpacity key={c} onPress={() => { setCondition(c); setSelCat('All'); }}
                    style={[styles.condChip,
                    condition === c && (c === 'Used' || c === 'Refurbished'
                      ? styles.condChipOrange : styles.condChipActive)]}>
                    <Text style={[styles.condChipText, condition === c && styles.condChipTextActive]}>{c === 'All' ? 'All Items' : c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Category chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginTop: 6 }} contentContainerStyle={{ gap: 8 }}>
                {(condition === 'Used' || condition === 'Refurbished' ? USED_CATS : SHOP_CATS).map(c => (
                  <TouchableOpacity key={c} onPress={() => setSelCat(c)}
                    style={[styles.catChip, selCat === c && styles.catChipActive]}>
                    <Text style={[styles.catChipText, selCat === c && styles.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          renderItem={({ item: p }) => {
            const isUsed = !!(p.condition === 'used' || p.condition === 'refurbished');
            return (
              <TouchableOpacity style={[styles.productCard, isUsed && styles.productCardUsed]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ProductDetail', { product: p })}>
                <View style={styles.productImgWrap}>
                  <Image source={{ uri: p.img || p.images?.[0] }} style={styles.productImg} />
                  {p.badge && !isUsed && (
                    <View style={[styles.productBadge, { backgroundColor: BADGE_COLORS[p.badge] || '#374151' }]}>
                      <Text style={styles.productBadgeText}>{p.badge}</Text>
                    </View>
                  )}
                  {isUsed && (
                    <View style={[styles.productBadge, { backgroundColor: p.condition === 'refurbished' ? '#3b82f6' : '#f97316' }]}>
                      <Text style={styles.productBadgeText}>{p.condition === 'refurbished' ? 'REFURB' : 'USED'}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productBody}>
                  <Text style={[styles.productCat, isUsed && { color: '#f97316' }]}>{p.cat || p.category}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{p.name || p.title}</Text>
                  <StarRating rating={p.rating} reviews={p.reviews || p.total_reviews} size={10} />
                  {isUsed && p.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <Feather name="map-pin" size={9} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{p.location}</Text>
                    </View>
                  )}
                  <View style={styles.productPriceRow}>
                    <Text style={[styles.productPrice, isUsed && { color: '#f97316' }]}>{fmt(p.price)}</Text>
                    {isUsed ? (
                      escrowDone[p.id] ? (
                        <View style={[styles.addBtn, { backgroundColor: '#10b981', paddingHorizontal: 8 }]}>
                          <Feather name="check" size={13} color="#fff" />
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => handleBuyNow(p)}
                          style={[styles.addBtn, { backgroundColor: '#f97316', paddingHorizontal: 8 }]}>
                          <Feather name="lock" size={12} color="#fff" />
                        </TouchableOpacity>
                      )
                    ) : (
                      <TouchableOpacity onPress={() => addItem({ ...p, name: p.name || p.title, img: p.img || p.images?.[0] })} style={styles.addBtn}>
                        <Feather name="plus" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="shopping-bag" title="No products found" subtitle="Try a different category or search term" />
          }
        />
      )}

      {/* ── SECOND-HAND TAB ───────────────────────────────────────────── */}
      {tab === 'Second-Hand' && (
        <FlatList
          data={filteredUsed.length ? filteredUsed : usedItems}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListHeaderComponent={() => (
            <View>
              {/* Banner */}
              <View style={styles.secondHandBanner}>
                <Text style={styles.secondHandTitle}>Buy & Sell Second-Hand</Text>
                <Text style={styles.secondHandSub}>Find bargains or turn unused items into cash. All listings reviewed by our team.</Text>
                <TouchableOpacity onPress={() => {
                  if (!user) {
                    Alert.alert('Sign In Required', 'Please sign in to list items.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Sign In', onPress: () => navigation.navigate('AuthModal') },
                    ]);
                    return;
                  }
                  setShowSellForm(true);
                }} style={styles.listBtn}>
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={styles.listBtnText}>List an Item</Text>
                </TouchableOpacity>
              </View>
              {/* Condition filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
                {['All', 'Used', 'Refurbished'].map(c => (
                  <TouchableOpacity key={c} onPress={() => setCondition(c === 'All' ? 'All' : c)}
                    style={[styles.condChip, condition === c && (c === 'All' ? styles.condChipActive : styles.condChipOrange)]}>
                    <Text style={[styles.condChipText, condition === c && styles.condChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          renderItem={({ item: p }) => (
            <Card>
              <Image source={{ uri: p.images?.[0] || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80' }} style={styles.secondHandImg} />
              <View style={[styles.productBody, { gap: 4 }]}>
                {/* Condition + location */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.condBadge, { backgroundColor: p.condition === 'refurbished' ? '#3b82f620' : '#f9731620' }]}>
                    <Text style={{ color: p.condition === 'refurbished' ? '#60a5fa' : '#fb923c', fontSize: 10, fontWeight: '700' }}>
                      {p.condition === 'refurbished' ? 'REFURB' : 'USED'}
                    </Text>
                  </View>
                  {p.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Feather name="map-pin" size={10} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{p.location}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.productName} numberOfLines={2}>{p.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Seller: {p.seller || 'Individual'}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <View>
                    <Text style={[styles.productPrice, { color: '#f97316' }]}>{fmt(p.price)}</Text>
                    {p.original_price && (
                      <Text style={{ color: colors.textMuted, fontSize: 11, textDecorationLine: 'line-through' }}>{fmt(p.original_price)}</Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('ChatScreen')}
                      style={[styles.addBtn, { backgroundColor: colors.dark4, borderWidth: 1, borderColor: colors.border }]}>
                      <Feather name="message-circle" size={14} color={colors.text} />
                    </TouchableOpacity>
                    {escrowDone[p.id] ? (
                      <View style={[styles.addBtn, { backgroundColor: '#10b981', paddingHorizontal: 10 }]}>
                        <Feather name="check" size={14} color="#fff" />
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => handleBuyNow(p)}
                        style={[styles.addBtn, { paddingHorizontal: 12, backgroundColor: '#f97316' }]}>
                        <Feather name="lock" size={12} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Buy</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {/* Escrow info */}
                <Text style={styles.escrowNote}>Secure escrow payment - funds held until you confirm receipt</Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState icon="tag" title="No second-hand items" subtitle="Be the first to list something!"
              action="List an Item" onAction={() => setShowSellForm(true)} />
          }
        />
      )}

      {/* ── CART TAB ──────────────────────────────────────────────────── */}
      {tab === 'Cart' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={cartItems}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
                <Image source={{ uri: item.img || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80' }} style={styles.cartItemImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>{fmt(item.price)}</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity onPress={() => updateQty(item.id, item.qty - 1)} style={styles.qtyBtn}>
                    <Feather name="minus" size={14} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                  <TouchableOpacity onPress={() => updateQty(item.id, item.qty + 1)} style={styles.qtyBtn}>
                    <Feather name="plus" size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: 4 }}>
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </TouchableOpacity>
              </Card>
            )}
            ListEmptyComponent={<EmptyState icon="shopping-cart" title="Cart is empty" subtitle="Browse products and add items" action="Shop Now" onAction={() => setTab('Shop')} />}
          />
          {cartItems.length > 0 && (
            <View style={styles.checkoutBar}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{cartCount} items</Text>
                <Text style={styles.totalText}>{fmt(total())}</Text>
              </View>
              <TouchableOpacity onPress={checkout} style={styles.checkoutBtn}>
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── ORDERS TAB ────────────────────────────────────────────────── */}
      {tab === 'Orders' && (
        <FlatList
          data={orders}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          renderItem={({ item: order }) => {
            const statusColor = { pending: '#f59e0b', held: '#3b82f6', released: '#10b981', confirmed: '#10b981', cancelled: '#ef4444' }[order.escrow_status || order.status] || colors.brand;
            const isEscrow = !!order.seller_id;
            return (
              <Card style={{ padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>#{(order.id || '').slice(-8).toUpperCase()}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {isEscrow && <Badge label="ESCROW" color="#f97316" />}
                    <Badge label={order.escrow_status || order.status} color={statusColor} />
                  </View>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{new Date(order.created_at).toLocaleDateString()}</Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{fmt(order.total_amount)}</Text>
                {isEscrow && order.escrow_status === 'held' && (
                  <Text style={styles.escrowNote}>Tap "Confirm Delivery" when you receive your item to release payment to seller.</Text>
                )}
              </Card>
            );
          }}
          ListEmptyComponent={<EmptyState icon="package" title="No orders yet" subtitle="Your purchases will appear here" action="Start Shopping" onAction={() => setTab('Shop')} />}
        />
      )}

      {/* ── SELL FORM MODAL ───────────────────────────────────────────── */}
      <Modal visible={showSellForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>List an Item</Text>
            <TouchableOpacity onPress={() => setShowSellForm(false)}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 4 }}>

            {/* Seller type badge */}
            <View style={styles.sellerTypeBadge}>
              <Feather name={sellerType === 'provider' ? 'briefcase' : 'user'} size={13} color={colors.brand} />
              <Text style={styles.sellerTypeText}>Listing as: {sellerLabel}</Text>
            </View>

            {/* Fields */}
            {[
              { label: 'Item Title *', key: 'title', placeholder: 'e.g. iPhone 12 in great condition' },
              { label: 'Description', key: 'description', placeholder: 'Condition, age, reason for selling…', multiline: true },
              { label: 'Price (GH\u20b5) *', key: 'price', placeholder: 'e.g. 800', keyboard: 'numeric' },
              { label: 'Location *', key: 'location', placeholder: 'e.g. East Legon, Accra' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 8 }}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.field, f.multiline && { height: 80, textAlignVertical: 'top' }]}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={listing[f.key]}
                  onChangeText={v => setListing(l => ({ ...l, [f.key]: v }))}
                  keyboardType={f.keyboard || 'default'}
                  multiline={f.multiline}
                />
              </View>
            ))}

            {/* Condition picker */}
            <Text style={styles.fieldLabel}>Condition *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {['used', 'refurbished'].map(c => (
                <TouchableOpacity key={c} onPress={() => setListing(l => ({ ...l, condition: c }))}
                  style={[styles.condChip, listing.condition === c && styles.condChipOrange]}>
                  <Text style={[styles.condChipText, listing.condition === c && { color: '#fff' }]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Commission preview */}
            {listing.price !== '' && parseFloat(listing.price) > 0 && (
              <View style={styles.commissionCard}>
                <Text style={styles.commissionTitle}>Earnings Breakdown</Text>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>Sale price</Text>
                  <Text style={styles.commissionValue}>{fmt(breakdown.price)}</Text>
                </View>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionLabel}>Platform fee (5%)</Text>
                  <Text style={{ color: '#ef4444', fontWeight: '600' }}>-{fmt(breakdown.fee)}</Text>
                </View>
                <View style={[styles.commissionRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>You receive</Text>
                  <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 15 }}>{fmt(breakdown.earn)}</Text>
                </View>
              </View>
            )}

            {/* Photo picker */}
            <TouchableOpacity onPress={pickImages} style={styles.imgPickerBtn}>
              <Feather name="image" size={16} color={colors.brand} />
              <Text style={{ color: colors.brand, fontWeight: '600' }}>Add Photos ({(listing.images || []).length}/5)</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }} contentContainerStyle={{ gap: 8 }}>
              {(listing.images || []).map((img, i) => (
                <TouchableOpacity key={i} onPress={() => setListing(l => ({ ...l, images: l.images.filter((_, j) => j !== i) }))}>
                  <Image source={{ uri: img }} style={styles.thumbImg} />
                  <View style={styles.thumbRemove}><Feather name="x" size={10} color="#fff" /></View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Admin notice */}
            <View style={styles.adminNotice}>
              <Feather name="shield" size={13} color={colors.brand} />
              <Text style={styles.adminNoticeText}>Your listing will go live after admin review (usually within 24 hours).</Text>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowSellForm(false)}
                style={[styles.listBtn, { flex: 1, backgroundColor: colors.dark4 }]}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitListing} style={[styles.listBtn, { flex: 2 }]}>
                <Feather name="send" size={14} color="#fff" />
                <Text style={styles.listBtnText}>Submit for Review</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── ESCROW PAYMENT SHEET ──────────────────────────────────────── */}
      {escrowPayment && (
        <PaymentSheet
          visible
          amount={escrowPayment.amount}
          title={'Buy: ' + (escrowPayment.product.title || escrowPayment.product.name) + ' (Escrow)'}
          onSuccess={(result) => handleEscrowSuccess(result, escrowPayment.product)}
          onClose={() => setEscrowPayment(null)}
        />
      )}

      {/* ── CART PAYMENT SHEET ────────────────────────────────────────── */}
      {cartPayment && (
        <PaymentSheet
          visible
          amount={cartPayment.price}
          title={cartPayment.name}
          onSuccess={async (result) => {
            try {
              const { data: order } = await supabase.from('orders').insert({
                user_id: user?.id,
                total_amount: total(),
                payment_method: result.method,
                status: 'confirmed',
                created_at: new Date().toISOString(),
              }).select().single();
              if (order) {
                await supabase.from('order_items').insert(
                  cartItems.map(item => ({
                    order_id: order.id,
                    product_id: item.id,
                    quantity: item.qty,
                    unit_price: item.price,
                  }))
                );
              }
            } catch { }
            useCartStore.getState().clearCart?.();
            setCartPayment(null);
            Alert.alert('Order Confirmed!', 'Payment successful. You will receive a confirmation shortly.');
            setTab('Orders');
            loadOrders();
          }}
          onClose={() => setCartPayment(null)}
        />
      )}
    </SafeAreaView>
  );
}

function useStyles(colors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },
  tabScroll: { flexGrow: 0, paddingVertical: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.dark3, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  cartBadge: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.dark3, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  // condition chips
  condChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.dark3, borderWidth: 1, borderColor: colors.border },
  condChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  condChipOrange: { backgroundColor: '#f9731620', borderColor: '#f97316' },
  condChipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  condChipTextActive: { color: '#fff' },
  condBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  // category chips
  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: colors.dark3, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.dark2, borderColor: colors.text },
  catChipText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  catChipTextActive: { color: colors.text },
  // product card
  productCard: { flex: 1, backgroundColor: colors.dark3, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  productCardUsed: { borderColor: '#f9731630' },
  productImgWrap: { position: 'relative' },
  productImg: { width: '100%', aspectRatio: 1, resizeMode: 'cover' },
  productBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  productBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  productBody: { padding: 10 },
  productCat: { color: colors.brand, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  productName: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 4, lineHeight: 18 },
  productPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice: { color: colors.text, fontSize: 15, fontWeight: '800' },
  addBtn: { backgroundColor: colors.brand, borderRadius: 10, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  // second-hand
  secondHandBanner: { backgroundColor: colors.dark3, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  secondHandTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  secondHandSub: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  secondHandImg: { width: '100%', height: 160, resizeMode: 'cover', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  escrowNote: { color: colors.textMuted, fontSize: 11, marginTop: 4, lineHeight: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  // sell form
  listBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  listBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  field: { backgroundColor: colors.dark4, borderRadius: 12, padding: 12, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  imgPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.brand, borderStyle: 'dashed', borderRadius: 12, padding: 14, marginTop: 10 },
  thumbImg: { width: 64, height: 64, borderRadius: 10, borderWidth: 2, borderColor: colors.brand },
  thumbRemove: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  sellerTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand + '18', borderRadius: 10, padding: 10, marginBottom: 4 },
  sellerTypeText: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  commissionCard: { backgroundColor: colors.dark3, borderRadius: 14, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: colors.border },
  commissionTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 10 },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commissionLabel: { color: colors.textMuted, fontSize: 13 },
  commissionValue: { color: colors.text, fontWeight: '600', fontSize: 13 },
  adminNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.brand + '10', borderRadius: 10, padding: 10, marginTop: 6 },
  adminNoticeText: { color: colors.textMuted, fontSize: 12, flex: 1, lineHeight: 17 },
  // modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  // cart
  cartItemImg: { width: 64, height: 64, borderRadius: 12, resizeMode: 'cover' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.dark4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  qtyText: { color: colors.text, fontWeight: '700', fontSize: 15, minWidth: 20, textAlign: 'center' },
  checkoutBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.dark2 },
  totalText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  checkoutBtn: { backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  checkoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

}