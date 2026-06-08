<?php

namespace App\Http\Controllers\Api\PublicApi;

use App\Http\Controllers\Controller;
use App\Models\Reader;

class ReaderController extends Controller
{
    public function index()
    {
        return response()->json(
            Reader::where('is_active', true)->get()
        );
    }
}
