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

using namespace anchor;

// Helper: Convert JS Object to Atom
Atom JSToAtom(const Napi::Object& obj) {
    Atom atom;
    if (obj.Has("id")) atom.id = obj.Get("id").As<Napi::Number>().Int64Value();
    if (obj.Has("source_id")) atom.source_id = obj.Get("source_id").As<Napi::String>().Utf8Value();
    if (obj.Has("content")) atom.content = obj.Get("content").As<Napi::String>().Utf8Value();
    if (obj.Has("char_start")) atom.char_start = obj.Get("char_start").As<Napi::Number>().Uint32Value();
    if (obj.Has("char_end")) atom.char_end = obj.Get("char_end").As<Napi::Number>().Uint32Value();
    if (obj.Has("timestamp")) atom.timestamp = obj.Get("timestamp").As<Napi::Number>().DoubleValue();

    if (obj.Has("simhash")) {
        Napi::Value val = obj.Get("simhash");
        if (val.IsBigInt()) {
            bool lossless;
            atom.simhash = val.As<Napi::BigInt>().Uint64Value(&lossless);
        } else if (val.IsNumber()) {
            atom.simhash = static_cast<uint64_t>(val.As<Napi::Number>().Int64Value());
        }
    }

    if (obj.Has("compound_id")) atom.compound_id = obj.Get("compound_id").As<Napi::String>().Utf8Value();
    if (obj.Has("start_byte")) atom.start_byte = obj.Get("start_byte").As<Napi::Number>().Uint32Value();
    if (obj.Has("end_byte")) atom.end_byte = obj.Get("end_byte").As<Napi::Number>().Uint32Value();

    if (obj.Has("tags") && obj.Get("tags").IsArray()) {
        Napi::Array tags = obj.Get("tags").As<Napi::Array>();
        for (uint32_t i = 0; i < tags.Length(); i++) {
            atom.tags.push_back(tags.Get(i).As<Napi::String>().Utf8Value());
        }
    }

    return atom;
}

// Helper: Convert Atom to JS Object
Napi::Object AtomToJS(Napi::Env env, const Atom& atom) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("id", Napi::Number::New(env, static_cast<double>(atom.id)));
    obj.Set("source_id", Napi::String::New(env, atom.source_id));
    obj.Set("content", Napi::String::New(env, atom.content));
    obj.Set("char_start", Napi::Number::New(env, atom.char_start));
    obj.Set("char_end", Napi::Number::New(env, atom.char_end));
    obj.Set("timestamp", Napi::Number::New(env, atom.timestamp));
    obj.Set("simhash", Napi::BigInt::New(env, atom.simhash));

    if (atom.compound_id) obj.Set("compound_id", Napi::String::New(env, *atom.compound_id));
    if (atom.start_byte) obj.Set("start_byte", Napi::Number::New(env, *atom.start_byte));
    if (atom.end_byte) obj.Set("end_byte", Napi::Number::New(env, *atom.end_byte));

    Napi::Array tags = Napi::Array::New(env, atom.tags.size());
    for (size_t i = 0; i < atom.tags.size(); i++) {
        tags.Set(i, Napi::String::New(env, atom.tags[i]));
    }
    obj.Set("tags", tags);

    return obj;
}

// Helper: Convert JS Object to Candidate
Candidate JSToCandidate(const Napi::Object& obj) {
    Candidate c;
    if (obj.Has("atom_id")) c.atom_id = obj.Get("atom_id").As<Napi::Number>().Int64Value();
    if (obj.Has("hop_distance")) c.hop_distance = obj.Get("hop_distance").As<Napi::Number>().Int32Value();
    if (obj.Has("shared_tags")) c.shared_tags = obj.Get("shared_tags").As<Napi::Number>().Int32Value();
    if (obj.Has("physical_bonus")) c.physical_bonus = obj.Get("physical_bonus").As<Napi::Number>().DoubleValue();
    if (obj.Has("timestamp")) c.timestamp = obj.Get("timestamp").As<Napi::Number>().DoubleValue();

    if (obj.Has("simhash")) {
         Napi::Value val = obj.Get("simhash");
        if (val.IsBigInt()) {
             bool lossless;
             c.simhash = val.As<Napi::BigInt>().Uint64Value(&lossless);
        } else if (val.IsNumber()) {
             c.simhash = static_cast<uint64_t>(val.As<Napi::Number>().Int64Value());
        }
    }

    if (obj.Has("gravity_score")) c.gravity_score = obj.Get("gravity_score").As<Napi::Number>().DoubleValue();

    return c;
}

// Helper: Convert Candidate to JS Object
Napi::Object CandidateToJS(Napi::Env env, const Candidate& c) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("atom_id", Napi::Number::New(env, static_cast<double>(c.atom_id)));
    obj.Set("hop_distance", Napi::Number::New(env, c.hop_distance));
    obj.Set("shared_tags", Napi::Number::New(env, c.shared_tags));
    obj.Set("physical_bonus", Napi::Number::New(env, c.physical_bonus));
    obj.Set("timestamp", Napi::Number::New(env, c.timestamp));
    obj.Set("simhash", Napi::BigInt::New(env, c.simhash));
    obj.Set("gravity_score", Napi::Number::New(env, c.gravity_score));

    return obj;
}

// ==================== Database Binding ====================

class DatabaseWrapper : public Napi::ObjectWrap<DatabaseWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    DatabaseWrapper(const Napi::CallbackInfo& info);
    Database* GetInternalInstance() const { return db_.get(); }
    
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
    
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Atom object required").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    try {
        Atom atom = JSToAtom(info[0].As<Napi::Object>());
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
            result.Set(i, AtomToJS(env, atoms[i]));
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
    Napi::Env env = info.Env();
    try {
        db_->wipeAllData();
        return env.Undefined();
    } catch (const DatabaseError& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
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

// ==================== ContextInflator Binding ====================

class ContextInflatorWrapper : public Napi::ObjectWrap<ContextInflatorWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    ContextInflatorWrapper(const Napi::CallbackInfo& info);

private:
    std::unique_ptr<ContextInflator> inflator_;

    Napi::Value Inflate(const Napi::CallbackInfo& info);
    Napi::Value InflateFromMolecules(const Napi::CallbackInfo& info);

    static Napi::FunctionReference constructor;
};

Napi::FunctionReference ContextInflatorWrapper::constructor;

Napi::Object ContextInflatorWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "ContextInflator", {
        InstanceMethod("inflate", &ContextInflatorWrapper::Inflate),
        InstanceMethod("inflateFromMolecules", &ContextInflatorWrapper::InflateFromMolecules),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("ContextInflator", func);
    return exports;
}

ContextInflatorWrapper::ContextInflatorWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<ContextInflatorWrapper>(info) {
    ContextInflatorConfig config;

    if (info.Length() > 0 && info[0].IsObject()) {
        Napi::Object configObj = info[0].As<Napi::Object>();
        if (configObj.Has("base_radius")) {
            config.base_radius = configObj.Get("base_radius").As<Napi::Number>().Int64Value();
        }
        if (configObj.Has("max_chars")) {
            config.max_chars = configObj.Get("max_chars").As<Napi::Number>().Int64Value();
        }
        if (configObj.Has("expand_to_paragraphs")) {
            config.expand_to_paragraphs = configObj.Get("expand_to_paragraphs").As<Napi::Boolean>().Value();
        }
    }

    inflator_ = std::make_unique<ContextInflator>(config);
}

Napi::Value ContextInflatorWrapper::Inflate(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3 || !info[0].IsObject() || !info[1].IsArray() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Arguments: Database, atom_ids[], max_chars").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Unwrap Database
    Napi::Object dbObj = info[0].As<Napi::Object>();
    DatabaseWrapper* dbWrapper = Napi::ObjectWrap<DatabaseWrapper>::Unwrap(dbObj);
    Database* db = dbWrapper->GetInternalInstance();

    if (!db) {
        Napi::Error::New(env, "Invalid Database instance").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Convert atom_ids
    Napi::Array idsArr = info[1].As<Napi::Array>();
    std::vector<AtomId> atomIds;
    for (uint32_t i = 0; i < idsArr.Length(); i++) {
        atomIds.push_back(static_cast<AtomId>(idsArr.Get(i).As<Napi::Number>().Int64Value()));
    }

    size_t maxChars = info[2].As<Napi::Number>().Int64Value();

    try {
        auto atoms = inflator_->inflate(*db, atomIds, maxChars);

        Napi::Array result = Napi::Array::New(env, atoms.size());
        for (size_t i = 0; i < atoms.size(); i++) {
            result.Set(i, AtomToJS(env, atoms[i]));
        }

        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value ContextInflatorWrapper::InflateFromMolecules(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3 || !info[0].IsObject() || !info[1].IsArray() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Arguments: Database, molecule_ids[], max_chars").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Unwrap Database
    Napi::Object dbObj = info[0].As<Napi::Object>();
    DatabaseWrapper* dbWrapper = Napi::ObjectWrap<DatabaseWrapper>::Unwrap(dbObj);
    Database* db = dbWrapper->GetInternalInstance();

    if (!db) {
        Napi::Error::New(env, "Invalid Database instance").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Convert molecule_ids
    Napi::Array idsArr = info[1].As<Napi::Array>();
    std::vector<AtomId> moleculeIds;
    for (uint32_t i = 0; i < idsArr.Length(); i++) {
        moleculeIds.push_back(static_cast<AtomId>(idsArr.Get(i).As<Napi::Number>().Int64Value()));
    }

    size_t maxChars = info[2].As<Napi::Number>().Int64Value();

    try {
        auto atoms = inflator_->inflateFromMolecules(*db, moleculeIds, maxChars);

        Napi::Array result = Napi::Array::New(env, atoms.size());
        for (size_t i = 0; i < atoms.size(); i++) {
            result.Set(i, AtomToJS(env, atoms[i]));
        }

        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ==================== Deduplicator Binding ====================

class DeduplicatorWrapper : public Napi::ObjectWrap<DeduplicatorWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    DeduplicatorWrapper(const Napi::CallbackInfo& info);

private:
    std::unique_ptr<Deduplicator> deduplicator_;

    Napi::Value Deduplicate(const Napi::CallbackInfo& info);
    Napi::Value DeduplicateWithContent(const Napi::CallbackInfo& info);

    static Napi::FunctionReference constructor;
};

Napi::FunctionReference DeduplicatorWrapper::constructor;

Napi::Object DeduplicatorWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "Deduplicator", {
        InstanceMethod("deduplicate", &DeduplicatorWrapper::Deduplicate),
        InstanceMethod("deduplicateWithContent", &DeduplicatorWrapper::DeduplicateWithContent),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("Deduplicator", func);
    return exports;
}

DeduplicatorWrapper::DeduplicatorWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<DeduplicatorWrapper>(info) {
    DeduplicatorConfig config;

    if (info.Length() > 0 && info[0].IsObject()) {
        Napi::Object configObj = info[0].As<Napi::Object>();
        if (configObj.Has("geometric_threshold")) {
            config.geometric_threshold = configObj.Get("geometric_threshold").As<Napi::Number>().DoubleValue();
        }
        if (configObj.Has("md5_prefix_length")) {
            config.md5_prefix_length = configObj.Get("md5_prefix_length").As<Napi::Number>().Int64Value();
        }
        if (configObj.Has("fuzzy_prefix_min")) {
            config.fuzzy_prefix_min = configObj.Get("fuzzy_prefix_min").As<Napi::Number>().DoubleValue();
        }
        if (configObj.Has("fuzzy_prefix_max")) {
            config.fuzzy_prefix_max = configObj.Get("fuzzy_prefix_max").As<Napi::Number>().DoubleValue();
        }
        if (configObj.Has("simhash_distance_threshold")) {
            config.simhash_distance_threshold = configObj.Get("simhash_distance_threshold").As<Napi::Number>().Int32Value();
        }
    }

    deduplicator_ = std::make_unique<Deduplicator>(config);
}

Napi::Value DeduplicatorWrapper::Deduplicate(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsArray()) {
        Napi::TypeError::New(env, "Arguments: candidates[]").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Convert candidates
    Napi::Array candidatesArr = info[0].As<Napi::Array>();
    std::vector<Candidate> candidates;
    for (uint32_t i = 0; i < candidatesArr.Length(); i++) {
        if (candidatesArr.Get(i).IsObject()) {
            candidates.push_back(JSToCandidate(candidatesArr.Get(i).As<Napi::Object>()));
        }
    }

    try {
        auto unique = deduplicator_->deduplicate(candidates);

        Napi::Array result = Napi::Array::New(env, unique.size());
        for (size_t i = 0; i < unique.size(); i++) {
            result.Set(i, CandidateToJS(env, unique[i]));
        }

        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value DeduplicatorWrapper::DeduplicateWithContent(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "Arguments: candidates[], contents[]").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Convert candidates
    Napi::Array candidatesArr = info[0].As<Napi::Array>();
    std::vector<Candidate> candidates;
    for (uint32_t i = 0; i < candidatesArr.Length(); i++) {
        if (candidatesArr.Get(i).IsObject()) {
            candidates.push_back(JSToCandidate(candidatesArr.Get(i).As<Napi::Object>()));
        }
    }

    // Convert contents
    Napi::Array contentsArr = info[1].As<Napi::Array>();
    std::vector<std::string> contents;
    for (uint32_t i = 0; i < contentsArr.Length(); i++) {
        contents.push_back(contentsArr.Get(i).As<Napi::String>().Utf8Value());
    }

    if (candidates.size() != contents.size()) {
        Napi::Error::New(env, "Candidates and contents arrays must have same length").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        auto unique = deduplicator_->deduplicateWithContent(candidates, contents);

        Napi::Array result = Napi::Array::New(env, unique.size());
        for (size_t i = 0; i < unique.size(); i++) {
            result.Set(i, CandidateToJS(env, unique[i]));
        }

        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// ==================== TransientFilter Binding ====================

class TransientFilterWrapper : public Napi::ObjectWrap<TransientFilterWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    TransientFilterWrapper(const Napi::CallbackInfo& info);

private:
    std::unique_ptr<TransientFilter> filter_;

    Napi::Value Apply(const Napi::CallbackInfo& info);
    Napi::Value IsTransient(const Napi::CallbackInfo& info);
    Napi::Value AddPattern(const Napi::CallbackInfo& info);
    Napi::Value RemovePattern(const Napi::CallbackInfo& info);
    Napi::Value GetPatterns(const Napi::CallbackInfo& info);

    static Napi::FunctionReference constructor;
};

Napi::FunctionReference TransientFilterWrapper::constructor;

Napi::Object TransientFilterWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "TransientFilter", {
        InstanceMethod("apply", &TransientFilterWrapper::Apply),
        InstanceMethod("isTransient", &TransientFilterWrapper::IsTransient),
        InstanceMethod("addPattern", &TransientFilterWrapper::AddPattern),
        InstanceMethod("removePattern", &TransientFilterWrapper::RemovePattern),
        InstanceMethod("getPatterns", &TransientFilterWrapper::GetPatterns),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("TransientFilter", func);
    return exports;
}

TransientFilterWrapper::TransientFilterWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<TransientFilterWrapper>(info) {
    TransientFilterConfig config;

    if (info.Length() > 0 && info[0].IsObject()) {
        Napi::Object configObj = info[0].As<Napi::Object>();
        if (configObj.Has("patterns") && configObj.Get("patterns").IsArray()) {
            config.patterns.clear();
            Napi::Array patterns = configObj.Get("patterns").As<Napi::Array>();
            for (uint32_t i = 0; i < patterns.Length(); i++) {
                config.patterns.push_back(patterns.Get(i).As<Napi::String>().Utf8Value());
            }
        }
        if (configObj.Has("min_content_length")) {
            config.min_content_length = configObj.Get("min_content_length").As<Napi::Number>().Int64Value();
        }
    }

    filter_ = std::make_unique<TransientFilter>(config);
}

Napi::Value TransientFilterWrapper::Apply(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsArray()) {
        Napi::TypeError::New(env, "Arguments: atoms[]").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Convert atoms
    Napi::Array atomsArr = info[0].As<Napi::Array>();
    std::vector<Atom> atoms;
    for (uint32_t i = 0; i < atomsArr.Length(); i++) {
        if (atomsArr.Get(i).IsObject()) {
            atoms.push_back(JSToAtom(atomsArr.Get(i).As<Napi::Object>()));
        }
    }

    try {
        auto filtered = filter_->apply(atoms);

        Napi::Array result = Napi::Array::New(env, filtered.size());
        for (size_t i = 0; i < filtered.size(); i++) {
            result.Set(i, AtomToJS(env, filtered[i]));
        }

        return result;
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Value TransientFilterWrapper::IsTransient(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Arguments: content").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string content = info[0].As<Napi::String>().Utf8Value();
    bool isTransient = filter_->isTransient(content);

    return Napi::Boolean::New(env, isTransient);
}

Napi::Value TransientFilterWrapper::AddPattern(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Arguments: pattern").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string pattern = info[0].As<Napi::String>().Utf8Value();
    filter_->addPattern(pattern);

    return env.Undefined();
}

Napi::Value TransientFilterWrapper::RemovePattern(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Arguments: pattern").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string pattern = info[0].As<Napi::String>().Utf8Value();
    filter_->removePattern(pattern);

    return env.Undefined();
}

Napi::Value TransientFilterWrapper::GetPatterns(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto patterns = filter_->getPatterns();

    Napi::Array result = Napi::Array::New(env, patterns.size());
    for (size_t i = 0; i < patterns.size(); i++) {
        result.Set(i, Napi::String::New(env, patterns[i]));
    }

    return result;
}

// ==================== Module Initialization ====================

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    DatabaseWrapper::Init(env, exports);
    PhysicsWalkerWrapper::Init(env, exports);
    ContextInflatorWrapper::Init(env, exports);
    DeduplicatorWrapper::Init(env, exports);
    TransientFilterWrapper::Init(env, exports);
    
    return exports;
}

NODE_API_MODULE(anchor_core, InitAll)
