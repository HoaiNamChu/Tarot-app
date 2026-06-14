<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;

class SettingController extends Controller
{
    public function payment()
    {
        return response()->json([
            'bank_name' => AppSetting::getValue('bank_name', config('tarot.bank.name')),
            'bank_bin' => AppSetting::getValue('bank_bin', config('tarot.bank.bin')),
            'bank_account_number' => AppSetting::getValue('bank_account_number', config('tarot.bank.account_number')),
            'bank_account_name' => AppSetting::getValue('bank_account_name', config('tarot.bank.account_name')),
            'bank_transfer_prefix' => AppSetting::getValue('bank_transfer_prefix', config('tarot.bank.transfer_prefix')),
        ]);
    }
}
