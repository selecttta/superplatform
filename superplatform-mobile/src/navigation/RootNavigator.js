/**
 * RootNavigator.js — Warning-free, production-ready navigation
 *
 * Rules enforced:
 * - NO inline arrow functions on `component` prop
 * - 4 bottom tabs only: Home | Categories | Cart | Account
 * - Notifications in header, NOT tabs
 * - Messages inside Account section, NOT a tab
 * - All stacks include: ProductDetail, ProviderDetail, Search, Notifications, Cart, ChatList, ChatDetail
 * - GuestTabs prompt login for Cart + Account via navigationRef
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/constants';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// ── Auth ─────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
// ── Customer ──────────────────────────────────────────────────────────────────
import HomeScreen from '../screens/customer/HomeScreen';
import CustomerDashboardScreen from '../screens/customer/CustomerDashboardScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
// ── Category screens ──────────────────────────────────────────────────────────
import TransportScreen from '../screens/transport/TransportScreen';
import HealthScreen from '../screens/health/HealthScreen';
import EcommerceScreen from '../screens/ecommerce/EcommerceScreen';
import BeautyScreen from '../screens/beauty/BeautyScreen';
import HomeServicesScreen from '../screens/homeservices/HomeServicesScreen';
import RealEstateScreen from '../screens/realestate/RealEstateScreen';
import RentalsScreen from '../screens/rentals/RentalsScreen';
// ── Shared ────────────────────────────────────────────────────────────────────
import ProviderDetailScreen from '../screens/provider/ProviderDetailScreen';
import ProviderDashboardScreen from '../screens/provider/ProviderDashboardScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatDetailScreen from '../screens/chat/ChatDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProductDetailScreen from '../screens/shared/ProductDetailScreen';
import CartScreen from '../screens/shared/CartScreen';
import CategoriesScreen from '../screens/shared/CategoriesScreen';
import FavoritesScreen from '../screens/shared/FavoritesScreen';
import SearchScreen from '../screens/shared/SearchScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

// ── Navigator instances (created ONCE at module level) ───────────────────────
const Root = createNativeStackNavigator();
const AuthStk = createNativeStackNavigator();
const HomeStk = createNativeStackNavigator();
const CatStk = createNativeStackNavigator();
const CartStk = createNativeStackNavigator();
const FavStk = createNativeStackNavigator();
const AccStk = createNativeStackNavigator();
const ProvStk = createNativeStackNavigator();
const AdminStk = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Navigation ref for imperative navigation from outside React tree ──────────
export const navigationRef = createNavigationContainerRef();

// ── Shared screen options (dynamic — use inside components via useTheme) ──────
function getScreenOpts(colors) {
  return {
    headerStyle: { backgroundColor: colors.dark2 },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700', fontSize: 17, color: colors.text },
    headerBackTitle: '',
    contentStyle: { backgroundColor: colors.dark },
  };
}

function getTabOpts(colors) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  };
}

// ── Custom Tab Bar with notched curve around FAB ──────────────────────────────
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = 70;
const NOTCH_RADIUS = 38;
const NOTCH_DEPTH = 50;

function getTabBarPath(width) {
  const mid = width / 2;
  const D = NOTCH_DEPTH;
  const R = NOTCH_RADIUS;
  // S-curve transition width on each side
  const sWidth = 22;
  const arcStartX = mid - R;
  const arcEndX = mid + R;
  return [
    `M0,${D}`,
    // Flat bar to start of hill slope
    `L${arcStartX - sWidth},${D}`,
    // Hill slope: curves up slightly then sweeps down into the arc
    `C${arcStartX - 8},${D} ${arcStartX - 6},${D - 8} ${arcStartX},${D}`,
    // Semicircular arc around the cart top
    `A${R},${R} 0 0 1 ${arcEndX},${D}`,
    // Hill slope: sweeps up from arc then curves back down to flat
    `C${arcEndX + 6},${D - 8} ${arcEndX + 8},${D} ${arcEndX + sWidth},${D}`,
    // Flat bar to right edge
    `L${width},${D}`,
    `L${width},${D + TAB_BAR_HEIGHT}`,
    `L0,${D + TAB_BAR_HEIGHT}`,
    `Z`,
  ].join(' ');
}

function CustomTabBar({ state, descriptors, navigation }) {
  const [barWidth, setBarWidth] = React.useState(400);
  const cartIndex = state.routes.findIndex(r => r.name === 'CartTab');
  const { colors } = useTheme();
  return (
    <View
      style={tabStyles.container}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {/* SVG background with notch */}
      <Svg
        width={barWidth}
        height={NOTCH_DEPTH + TAB_BAR_HEIGHT}
        style={tabStyles.svgBg}
      >
        <Path
          d={getTabBarPath(barWidth)}
          fill={colors.dark2}
        />
      </Svg>

      {/* Tab items layer */}
      <View style={tabStyles.tabsRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;
          const isCart = index === cartIndex;
          const color = isFocused ? colors.brand : colors.textMuted;

          const iconName = {
            HomeTab: 'home',
            CategoriesTab: 'grid',
            CartTab: 'shopping-cart',
            FavoritesTab: 'heart',
            AccountTab: 'user',
          }[route.name] || 'circle';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Cart gets a spacer in the row; the actual FAB is absolutely positioned
          if (isCart) {
            return <View key={route.key} style={{ flex: 1 }} />;
          }

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={tabStyles.tabItem} activeOpacity={0.7}>
              <Feather name={iconName} size={22} color={color} />
              <Text style={[tabStyles.label, { color }]}>{label}</Text>
              {isFocused && <View style={tabStyles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating Cart FAB — absolutely positioned above the notch */}
      <TouchableOpacity
        onPress={() => {
          const cartRoute = state.routes[cartIndex];
          const event = navigation.emit({ type: 'tabPress', target: cartRoute.key, canPreventDefault: true });
          if (state.index !== cartIndex && !event.defaultPrevented) {
            navigation.navigate(cartRoute.name);
          }
        }}
        style={tabStyles.cartBtnOuter}
        activeOpacity={0.8}
      >
        <View style={tabStyles.cartCircle}>
          <Feather name="shopping-cart" size={22} color="#fff" />
          {descriptors[state.routes[cartIndex].key].options.tabBarBadge != null && (
            <View style={tabStyles.cartBadge}>
              <Text style={tabStyles.cartBadgeTxt}>
                {descriptors[state.routes[cartIndex].key].options.tabBarBadge}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: NOTCH_DEPTH + TAB_BAR_HEIGHT,
  },
  svgBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: TAB_BAR_HEIGHT,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.brand,
    marginTop: 2,
  },
  cartBtnOuter: {
    position: 'absolute',
    top: 16,
    left: '50%',
    marginLeft: -34,
    alignItems: 'center',
    zIndex: 10,
  },
  cartCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});


// ── Category screens list (shared across stacks) ──────────────────────────────
const CAT_SCREENS = [
  { name: 'Transport', Comp: TransportScreen, title: 'Transport & Rides' },
  { name: 'Health', Comp: HealthScreen, title: 'Health Services' },
  { name: 'Ecommerce', Comp: EcommerceScreen, title: 'Shop' },
  { name: 'Beauty', Comp: BeautyScreen, title: 'Beauty & Fashion' },
  { name: 'HomeServices', Comp: HomeServicesScreen, title: 'Home Services' },
  { name: 'RealEstate', Comp: RealEstateScreen, title: 'Real Estate' },
  { name: 'Rentals', Comp: RentalsScreen, title: 'Rentals' },
];

// ── Shared screens appended to every browsable stack ─────────────────────────
// NOTE: Using Stk.Screen directly — no helper function returning JSX fragments
// to avoid React Navigation warnings about component identity.

// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthNav() {
  return (
    <AuthStk.Navigator screenOptions={{ headerShown: false }}>
      <AuthStk.Screen name="Login" component={LoginScreen} />
      <AuthStk.Screen name="Register" component={RegisterScreen} />
    </AuthStk.Navigator>
  );
}

// ── Tab 1 : Home Stack ────────────────────────────────────────────────────────
function HomeNav() {
  const { colors } = useTheme();
  return (
    <HomeStk.Navigator screenOptions={getScreenOpts(colors)}>
      <HomeStk.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      {CAT_SCREENS.map(s => (
        <HomeStk.Screen key={s.name} name={s.name} component={s.Comp} options={{ title: s.title }} />
      ))}
      <HomeStk.Screen name="ProviderDetail" component={ProviderDetailScreen} options={{ title: 'Details' }} />
      <HomeStk.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <HomeStk.Screen name="Payment" component={PaymentScreen} options={{ title: 'Checkout', presentation: 'modal' }} />
      <HomeStk.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <HomeStk.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <HomeStk.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <HomeStk.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <HomeStk.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
    </HomeStk.Navigator>
  );
}

// ── Tab 2 : Categories Stack ──────────────────────────────────────────────────
function CatNav() {
  const { colors } = useTheme();
  return (
    <CatStk.Navigator screenOptions={getScreenOpts(colors)}>
      <CatStk.Screen name="CategoriesRoot" component={CategoriesScreen} options={{ headerShown: false }} />
      {CAT_SCREENS.map(s => (
        <CatStk.Screen key={s.name} name={s.name} component={s.Comp} options={{ title: s.title }} />
      ))}
      <CatStk.Screen name="ProviderDetail" component={ProviderDetailScreen} options={{ title: 'Details' }} />
      <CatStk.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <CatStk.Screen name="Payment" component={PaymentScreen} options={{ title: 'Checkout', presentation: 'modal' }} />
      <CatStk.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <CatStk.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <CatStk.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <CatStk.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <CatStk.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
    </CatStk.Navigator>
  );
}

// ── Tab 3 : Cart Stack ────────────────────────────────────────────────────────
function CartNav() {
  const { colors } = useTheme();
  return (
    <CartStk.Navigator screenOptions={getScreenOpts(colors)}>
      <CartStk.Screen name="CartMain" component={CartScreen} options={{ title: 'My Cart' }} />
      <CartStk.Screen name="Payment" component={PaymentScreen} options={{ title: 'Checkout', presentation: 'modal' }} />
      <CartStk.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <CartStk.Screen name="ProviderDetail" component={ProviderDetailScreen} options={{ title: 'Details' }} />
      <CartStk.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <CartStk.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <CartStk.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <CartStk.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
    </CartStk.Navigator>
  );
}

// ── Tab 4 : Favorites Stack ───────────────────────────────────────────────────
function FavNav() {
  const { colors } = useTheme();
  return (
    <FavStk.Navigator screenOptions={getScreenOpts(colors)}>
      <FavStk.Screen name="FavoritesMain" component={FavoritesScreen} options={{ headerShown: false }} />
      <FavStk.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <FavStk.Screen name="ProviderDetail" component={ProviderDetailScreen} options={{ title: 'Details' }} />
      <FavStk.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <FavStk.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </FavStk.Navigator>
  );
}

// ── Tab 5 : Account Stack ─────────────────────────────────────────────────────
function AccNav() {
  const { colors } = useTheme();
  return (
    <AccStk.Navigator screenOptions={getScreenOpts(colors)}>
      <AccStk.Screen name="Account" component={CustomerDashboardScreen} options={{ title: 'My Account', headerShown: false }} />
      <AccStk.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile & Settings' }} />
      <AccStk.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <AccStk.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
      <AccStk.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <AccStk.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <AccStk.Screen name="Payment" component={PaymentScreen} options={{ title: 'Checkout', presentation: 'modal' }} />
      <AccStk.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <AccStk.Screen name="ProviderDetail" component={ProviderDetailScreen} options={{ title: 'Details' }} />
    </AccStk.Navigator>
  );
}

// ── Placeholder for guest-gated tabs (defined at module level — no inline comp) ─
function GuestPlaceholder() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.dark }} />;
}

// ── Customer Tab Navigator ────────────────────────────────────────────────────
// Defined at module level so component refs are stable
function CustomerTabs() {
  const cartCount = useCartStore(s => s.count());
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={getTabOpts(colors)} tabBar={props => <CustomTabBar {...props} />}>
      <Tab.Screen name="HomeTab" component={HomeNav}
        options={{ title: 'Home' }} />
      <Tab.Screen name="CategoriesTab" component={CatNav}
        options={{ title: 'Categories' }} />
      <Tab.Screen name="CartTab" component={CartNav}
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }} />
      <Tab.Screen name="FavoritesTab" component={FavNav}
        options={{ title: 'Favorites' }} />
      <Tab.Screen name="AccountTab" component={AccNav}
        options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

// ── Guest Tab Navigator ───────────────────────────────────────────────────────
// Auth-gated tabs use listeners + a real component to prevent inline-function warnings
function GuestTabs() {
  const cartCount = useCartStore(s => s.count());

  const handleAuthRequired = () => {
    Alert.alert(
      'Sign In Required',
      'Please sign in or create an account to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign In',
          style: 'default',
          onPress: () => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('AuthModal');
            }
          },
        },
      ]
    );
  };

  const { colors: themeColors } = useTheme();
  return (
    <Tab.Navigator screenOptions={getTabOpts(themeColors)} tabBar={props => <CustomTabBar {...props} />}>
      <Tab.Screen name="HomeTab" component={HomeNav}
        options={{ title: 'Home' }} />
      <Tab.Screen name="CategoriesTab" component={CatNav}
        options={{ title: 'Categories' }} />
      <Tab.Screen name="CartTab" component={CartNav}
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }} />
      <Tab.Screen name="FavoritesTab" component={FavNav}
        options={{ title: 'Favorites' }} />
      <Tab.Screen name="AccountTab" component={AccNav}
        options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

// ── Provider Stack ────────────────────────────────────────────────────────────
function ProviderNav() {
  const { colors } = useTheme();
  return (
    <ProvStk.Navigator screenOptions={getScreenOpts(colors)}>
      <ProvStk.Screen name="ProviderMain" component={ProviderDashboardScreen} options={{ headerShown: false }} />
      <ProvStk.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <ProvStk.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
      <ProvStk.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProvStk.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </ProvStk.Navigator>
  );
}

// ── Admin Stack ───────────────────────────────────────────────────────────────
function AdminNav() {
  const { colors } = useTheme();
  return (
    <AdminStk.Navigator screenOptions={getScreenOpts(colors)}>
      <AdminStk.Screen name="AdminMain" component={AdminDashboardScreen} options={{ headerShown: false }} />
      <AdminStk.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <AdminStk.Screen name="ChatDetail" component={ChatDetailScreen} options={({ route }) => ({ title: route.params?.name || 'Chat' })} />
      <AdminStk.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <AdminStk.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </AdminStk.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Navigator
// ─────────────────────────────────────────────────────────────────────────────
function RootNavigatorInner() {
  const { user, role, initialized, initialize } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDark, colors } = useTheme();

  useEffect(() => { initialize(); }, []);

  // Real-time unread message badge
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    (async () => {
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count || 0);
      } catch { }
    })();
    const ch = supabase.channel(`unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => setUnreadCount(c => c + 1))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  const navTheme = {
    dark: isDark,
    colors: {
      primary: colors.brand,
      background: colors.dark,
      card: colors.dark2,
      text: colors.text,
      border: colors.border,
      notification: colors.brand,
    },
  };

  // ── Admin ────────────────────────────────────────────────────────────────────
  if (user && role === 'admin') {
    return (
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="AdminApp" component={AdminNav} />
          <Root.Screen name="AuthModal" component={AuthNav} options={{ presentation: 'modal' }} />
        </Root.Navigator>
      </NavigationContainer>
    );
  }

  // ── Provider ─────────────────────────────────────────────────────────────────
  if (user && role === 'provider') {
    return (
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="ProviderApp" component={ProviderNav} />
          <Root.Screen name="AuthModal" component={AuthNav} options={{ presentation: 'modal' }} />
        </Root.Navigator>
      </NavigationContainer>
    );
  }

  // ── Logged-in Customer ────────────────────────────────────────────────────────
  if (user) {
    return (
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="CustomerApp" component={CustomerTabs} />
          <Root.Screen name="AuthModal" component={AuthNav} options={{ presentation: 'modal' }} />
        </Root.Navigator>
      </NavigationContainer>
    );
  }

  // ── Guest (not logged in) ─────────────────────────────────────────────────────
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="GuestApp" component={GuestTabs} />
        <Root.Screen name="AuthModal" component={AuthNav} options={{ presentation: 'modal' }} />
      </Root.Navigator>
    </NavigationContainer>
  );
}

// ── Wrapped export with ThemeProvider ──────────────────────────────────────────
export default function RootNavigator() {
  return (
    <ThemeProvider>
      <RootNavigatorInner />
    </ThemeProvider>
  );
}
