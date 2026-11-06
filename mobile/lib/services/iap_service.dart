import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';

import '../engine/engine.dart';

class IapService {
  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _sub;

  Future<bool> start(void Function(PurchaseDetails purchase) onPurchase) async {
    final available = await _iap.isAvailable();
    if (!available) return false;
    await _sub?.cancel();
    _sub = _iap.purchaseStream.listen((purchases) {
      for (final purchase in purchases) {
        onPurchase(purchase);
      }
    }, onError: (_, _) {});
    return true;
  }

  Future<List<ProductDetails>> load() async {
    final response = await _iap.queryProductDetails(productIds.toSet());
    return response.productDetails;
  }

  Future<void> buy(ProductDetails product) {
    return _iap.buyNonConsumable(purchaseParam: PurchaseParam(productDetails: product));
  }

  Future<void> restore() => _iap.restorePurchases();

  Future<void> finish(PurchaseDetails purchase) => _iap.completePurchase(purchase);

  void dispose() {
    _sub?.cancel();
  }
}
