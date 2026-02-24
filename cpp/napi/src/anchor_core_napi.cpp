/**
 * @file anchor_core_napi.cpp
 * @brief N-API bindings for Anchor Core C++ library
 */

#include <napi.h>
#include "database.h"
#include "physics_walker.h"
#include "context_inflator.h"
#include "deduplicator.h"
#include "transient_filter.h"

// Node.js N-API header
#include "node.h"

using namespace anchor;

// ==================== Database Binding ====================

class DatabaseWrapper : public Napi::ObjectWrap<DatabaseWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    DatabaseWrapper(const Napi::CallbackInfo& info);
    
private:
    std::unique_ptr<Database> db_;
    
    Napi::Value Open(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    Napi::Value InsertAtom(const Napi::CallbackInfo& info);
    Napi::Value SearchAtoms(const Napi::CallbackInfo& info);
    Napi::Value GetStats(const Napi::CallbackInfo& info);
    Napi::Value WipeAllData(const Napi::CallbackInfo& info);
    
    static Napi::FunctionReference constructor;
};

Napi::FunctionReference DatabaseWrapper::constructor;

Napi::Object DatabaseWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);
    
    Napi::Function func = DefineClass(env, "Database", {
        InstanceMethod("open", &DatabaseWrapper::Open),
        InstanceMethod("close", &DatabaseWrapper::Close),
        InstanceMethod("insertAtom", &DatabaseWrapper::InsertAtom),
        InstanceMethod("searchAtoms", &DatabaseWrapper::SearchAtoms),
        InstanceMethod("getStats", &DatabaseWrapper::GetStats),
        InstanceMethod("wipeAllData", &DatabaseWrapper::WipeAllData),
    });
    
    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    
    exports.Set("Database", func);
    return exports;
}

DatabaseWrapper::DatabaseWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<DatabaseWrapper>(info) {
    if (info.Length() > 0 && info[0].IsString()) {
        std::string path = info[0].As<Napi::String>().Utf8Value();
        db_ = std::make_unique<Database>(path);
    } else {
        db_ = std::make_unique<Database>(Database::inMemory());
    }
}

Napi::Value DatabaseWrapper::Open(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Path required").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    try {
        std::string path = info[0].As<Napi::String>().Utf8Value();
        db_.reset(new Database(path));
        return env.Undefined();
    } catch (const DatabaseError& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value DatabaseWrapper::Close(const Napi::CallbackInfo& info) {
    db_.reset();
    return info.Env().Undefined();
}

Napi::Value DatabaseWrapper::InsertAtom(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Simplified - in production, parse full atom object
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Atom object required").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    try {
        Napi::Object atomObj = info[0].As<Napi::Object>();
        
        Atom atom;
        atom.source_id = atomObj.Get("source_id").As<Napi::String>().Utf8Value();
        atom.content = atomObj.Get("content").As<Napi::String>().Utf8Value();
        atom.char_start = atomObj.Get("char_start").As<Napi::Number>().Uint32Value();
        atom.char_end = atomObj.Get("char_end").As<Napi::Number>().Uint32Value();
        atom.timestamp = atomObj.Get("timestamp").As<Napi::Number>().DoubleValue();
        atom.simhash = atomObj.Get("simhash").As<Napi::BigInt>().Uint64Value();
        
        AtomId id = db_->insertAtom(atom);
        return Napi::Number::New(env, static_cast<double>(id));
    } catch (const DatabaseError& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value DatabaseWrapper::SearchAtoms(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Query required").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    try {
        std::string query = info[0].As<Napi::String>().Utf8Value();
        size_t limit = info.Length() > 1 ? info[1].As<Napi::Number>().Uint32Value() : 100;
        
        auto atoms = db_->searchAtoms(query, limit);
        
        Napi::Array result = Napi::Array::New(env, atoms.size());
        for (size_t i = 0; i < atoms.size(); i++) {
            Napi::Object atomObj = Napi::Object::New(env);
            atomObj.Set("id", Napi::Number::New(env, static_cast<double>(atoms[i].id)));
            atomObj.Set("source_id", Napi::String::New(env, atoms[i].source_id));
            atomObj.Set("content", Napi::String::New(env, atoms[i].content));
            result.Set(i, atomObj);
        }
        
        return result;
    } catch (const DatabaseError& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value DatabaseWrapper::GetStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        auto stats = db_->getStats();
        
        Napi::Object result = Napi::Object::New(env);
        result.Set("atom_count", Napi::Number::New(env, static_cast<double>(stats.atom_count)));
        result.Set("source_count", Napi::Number::New(env, static_cast<double>(stats.source_count)));
        result.Set("tag_count", Napi::Number::New(env, static_cast<double>(stats.tag_count)));
        
        return result;
    } catch (const DatabaseError& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value DatabaseWrapper::WipeAllData(const Napi::CallbackInfo& info) {
    try {
        db_->wipeAllData();
        return info.Env().Undefined();
    } catch (const DatabaseError& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return info.Env().Null();
    }
}

// ==================== PhysicsWalker Binding ====================

class PhysicsWalkerWrapper : public Napi::ObjectWrap<PhysicsWalkerWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    PhysicsWalkerWrapper(const Napi::CallbackInfo& info);
    
private:
    std::unique_ptr<PhysicsWalker> walker_;
    
    Napi::Value PerformRadialInflation(const Napi::CallbackInfo& info);
    
    static Napi::FunctionReference constructor;
};

Napi::FunctionReference PhysicsWalkerWrapper::constructor;

Napi::Object PhysicsWalkerWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);
    
    Napi::Function func = DefineClass(env, "PhysicsWalker", {
        InstanceMethod("performRadialInflation", &PhysicsWalkerWrapper::PerformRadialInflation),
    });
    
    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    
    exports.Set("PhysicsWalker", func);
    return exports;
}

PhysicsWalkerWrapper::PhysicsWalkerWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<PhysicsWalkerWrapper>(info) {
    PhysicsWalkerConfig config;
    
    if (info.Length() > 0 && info[0].IsObject()) {
        Napi::Object configObj = info[0].As<Napi::Object>();
        if (configObj.Has("damping_factor")) {
            config.damping_factor = configObj.Get("damping_factor").As<Napi::Number>().DoubleValue();
        }
        if (configObj.Has("temporal_decay")) {
            config.temporal_decay = configObj.Get("temporal_decay").As<Napi::Number>().DoubleValue();
        }
        if (configObj.Has("walk_radius")) {
            config.walk_radius = configObj.Get("walk_radius").As<Napi::Number>().Uint32Value();
        }
    }
    
    walker_ = std::make_unique<PhysicsWalker>(config);
}

Napi::Value PhysicsWalkerWrapper::PerformRadialInflation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Simplified - in production, would take Database and anchor IDs
    Napi::Array result = Napi::Array::New(env, 0);
    return result;
}

// ==================== Module Initialization ====================

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    DatabaseWrapper::Init(env, exports);
    PhysicsWalkerWrapper::Init(env, exports);
    // TODO: Add ContextInflator, Deduplicator, TransientFilter wrappers
    
    return exports;
}

NODE_API_MODULE(anchor_core, InitAll)
