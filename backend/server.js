import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectMongo from "./mongo.js";

dotenv.config();

import { getSupabase } from "./supabaseClient.js";

const supabase = getSupabase();
import Feedback from "./models/Feedback.js";

const app = express();
app.use(cors());
app.use(express.json());
connectMongo();
const PORT = process.env.PORT || 3000;

//////////////////////////////////////////////////////
// 🔐 REGISTER USER
//////////////////////////////////////////////////////
app.post("/api/register/user", async (req, res) => {
    const { name, email, password } = req.body;

    const { error } = await supabase
        .from("users")
        .insert([{ name, email, password_hash: password }]);

    if (error) return res.status(400).json({ error });

    res.json({ message: "User registered successfully" });
});

//////////////////////////////////////////////////////
// 🔐 REGISTER ADMIN
//////////////////////////////////////////////////////
app.post("/api/register/admin", async (req, res) => {
    const { name, email, password, department_id } = req.body;

    const { error } = await supabase
        .from("administrators")
        .insert([
            { name, email, password_hash: password, department_id }
        ]);

    if (error) return res.status(400).json({ error });

    res.json({ message: "Admin registered successfully" });
});

//////////////////////////////////////////////////////
// 🔐 LOGIN
//////////////////////////////////////////////////////
app.post("/api/login", async (req, res) => {
    const { email, password, role } = req.body;

    const table = role === "admin" ? "administrators" : "users";

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("email", email)
        .single();

    if (error || !data)
        return res.status(401).json({ message: "User not found" });

    if (data.password_hash !== password)
        return res.status(401).json({ message: "Invalid password" });

    res.json({ message: "Login successful", user: data, role });
});

//////////////////////////////////////////////////////
// 📦 METADATA API
//////////////////////////////////////////////////////
app.get("/api/meta", async (req, res) => {
    const { data: departments } = await supabase.from("departments").select("*");
    const { data: priority } = await supabase.from("priority").select("*");
    const { data: status } = await supabase.from("status").select("*");

    res.json({ departments, priority, status });
});

//////////////////////////////////////////////////////
// 📝 FILE COMPLAINT
//////////////////////////////////////////////////////
app.post("/api/complaint", async (req, res) => {
    const { user_id, title, description, department_id, priority_id } = req.body;

    const { data, error } = await supabase
        .from("complaints")
        .insert([
            { user_id, title, description, department_id, priority_id }
        ])
        .select();

    if (error) return res.status(400).json({ error });

    const complaint_id = data[0].complaint_id;

    await supabase.from("status_updates").insert([
        {
            complaint_id,
            status_id: 1,
            remarks: "Complaint submitted"
        }
    ]);

    res.json({ message: "Complaint submitted", complaint_id });
});

//////////////////////////////////////////////////////
// 📄 USER: GET MY COMPLAINTS (FILTER + SORT)
//////////////////////////////////////////////////////
app.get("/api/my-complaints/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const { sort = "date", order = "desc" } = req.query;

    let query = supabase
        .from("complaints")
        .select(`
      complaint_id,
      title,
      description,
      date_of_submission,
      priority (priority_name),
      departments (department_name),
      status_updates (status_id, updated_date, remarks, status (status_name)),
      resolutions (resolution_text, resolved_at)
    `)
        .eq("user_id", user_id);

    if (sort === "priority") {
        query = query.order("priority_id", { ascending: order === "asc" });
    } else {
        query = query.order("date_of_submission", { ascending: order === "asc" });
    }

    const { data, error } = await query;

    if (error) return res.status(400).json({ error });

    res.json(data);
});

//////////////////////////////////////////////////////
// 🔍 GET FULL COMPLAINT DETAILS + STATUS + RESOLUTION
//////////////////////////////////////////////////////

app.get("/api/complaint/:id", async (req, res) => {
  const { id } = req.params;

  // 🔹 Get complaint details
  const { data: complaint } = await supabase
    .from("complaints")
    .select("title, description")
    .eq("complaint_id", id)
    .single();

  // 🔹 Get status history
  const { data: history } = await supabase
    .from("status_updates")
    .select(`
      updated_date,
      remarks,
      status (status_name),
      administrators (name)
    `)
    .eq("complaint_id", id)
    .order("updated_date", { ascending: true });

  // 🔹 Get resolution
  const { data: resolution } = await supabase
    .from("resolutions")
    .select("resolution_text, resolved_at")
    .eq("complaint_id", id)
    .single();

  res.json({ complaint, history, resolution });
});
//////////////////////////////////////////////////////
// 🛠️ ADMIN: VIEW COMPLAINTS (FILTER + SORT)
//////////////////////////////////////////////////////
app.get("/api/admin/complaints/:department_id", async (req, res) => {
    const { department_id } = req.params;
    const { priority } = req.query;

    let query = supabase
        .from("complaints")
        .select(`
      complaint_id,
      title,
      description,
      date_of_submission,
      users (name, email),
      priority (priority_name),
      status_updates (status_id, updated_date, remarks, status (status_name), administrators (name)),
      resolutions (resolution_text, resolved_at)
    `)
        .eq("department_id", department_id);

    if (priority) {
        query = query.eq("priority_id", priority);
    }

    const { data, error } = await query;

    if (error) return res.status(400).json({ error });

    res.json(data);
});

//////////////////////////////////////////////////////
// 🔄 ADMIN: UPDATE STATUS
//////////////////////////////////////////////////////
app.post("/api/admin/status", async (req, res) => {
    const { complaint_id, admin_id, status_id, remarks } = req.body;

    const { error } = await supabase
        .from("status_updates")
        .insert([
            { complaint_id, admin_id, status_id, remarks }
        ]);

    if (error) return res.status(400).json({ error });

    res.json({ message: "Status updated" });
});

//////////////////////////////////////////////////////
// ✅ ADMIN: RESOLVE COMPLAINT
//////////////////////////////////////////////////////
app.post("/api/admin/resolve", async (req, res) => {
    const { complaint_id, admin_id, resolution_text } = req.body;

    await supabase.from("status_updates").insert([
        {
            complaint_id,
            admin_id,
            status_id: 3,
            remarks: "Marked as resolved"
        }
    ]);

    await supabase.from("resolutions").insert([
        { complaint_id, admin_id, resolution_text }
    ]);

    res.json({ message: "Complaint resolved successfully" });
});

//////////////////////////////////////////////////////
// 🚀 START SERVER
//////////////////////////////////////////////////////
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

//////////////////////////////////////////////////////
// 🗳️ FEEDBACK (Mongo)
//////////////////////////////////////////////////////
// Save feedback for a complaint
app.post("/api/feedback", async (req, res) => {
    try {
        const { complaint_id, rating, comment, user } = req.body;
        const feedback = new Feedback({ complaint_id, rating, comment, user });
        await feedback.save();
        res.json({ message: "Feedback saved" });
    } catch (err) {
        console.error("Feedback save error:", err);
        res.status(500).json({ message: "Could not save feedback", error: err.message });
    }
});

// Get feedback list for a complaint
app.get("/api/feedback/:complaint_id", async (req, res) => {
    try {
        const { complaint_id } = req.params;
        const items = await Feedback.find({ complaint_id }).sort({ created_at: -1 });
        res.json(items);
    } catch (err) {
        console.error("Feedback fetch error:", err);
        res.status(500).json({ message: "Could not fetch feedback", error: err.message });
    }
});