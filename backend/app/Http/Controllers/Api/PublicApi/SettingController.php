<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\Payment\MoMoService;
use App\Services\Payment\VNPayService;

class SettingController extends Controller
{
    public function payment()
    {
        $momoService = app(MoMoService::class);
        $vnpayService = app(VNPayService::class);

        return response()->json([
            'bank_name' => AppSetting::getValue('bank_name', config('tarot.bank.name')),
            'bank_bin' => AppSetting::getValue('bank_bin', config('tarot.bank.bin')),
            'bank_account_number' => AppSetting::getValue('bank_account_number', config('tarot.bank.account_number')),
            'bank_account_name' => AppSetting::getValue('bank_account_name', config('tarot.bank.account_name')),
            'bank_transfer_prefix' => AppSetting::getValue('bank_transfer_prefix', config('tarot.bank.transfer_prefix')),
            'payment_vnpay_enabled' => AppSetting::getBool('payment_vnpay_enabled', true),
            'payment_vnpay_gateway_configured' => $vnpayService->isConfigured(),
            'payment_bank_enabled' => AppSetting::getBool('payment_bank_enabled', true),
            'payment_momo_enabled' => AppSetting::getBool('payment_momo_enabled', false),
            'payment_momo_gateway_configured' => $momoService->isConfigured(),
            'momo_phone' => AppSetting::getValue('momo_phone', ''),
            'momo_account_name' => AppSetting::getValue('momo_account_name', ''),
            'momo_transfer_prefix' => AppSetting::getValue('momo_transfer_prefix', 'MOMO'),
        ]);
    }
}
