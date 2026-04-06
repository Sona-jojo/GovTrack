const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEFAULT_PASSWORD = "NP@12345"

async function seedStaff() {

    console.log("🚀 Starting staff seeding...")

    const { data: bodies, error } = await supabase
        .from('local_bodies')
        .select('id, name, code')
        .neq('code', 'OTH')

    if (error) {
        console.error("Error fetching local bodies:", error)
        return
    }

    for (const body of bodies) {

        const shortCode = body.code.split('-')[0].toLowerCase()

        const roles = [
            { role: "secretary", email: `secretary_${shortCode}@np.gov` },
            { role: "engineer", email: `engineer_${shortCode}@np.gov` },
            { role: "clerk", email: `clerk_${shortCode}@np.gov` }
        ]

        for (const r of roles) {

            const { data: userData, error: userError } =
                await supabase.auth.admin.createUser({
                    email: r.email,
                    password: DEFAULT_PASSWORD,
                    email_confirm: true
                })

            if (userError) {
                console.log(`⚠️ Skipping ${r.email} (maybe exists)`)
                continue
            }

            await supabase.from('profiles').insert({
                id: userData.user.id,
                name: `${r.role.toUpperCase()} - ${body.name}`,
                role: r.role,
                local_body_id: body.id
            })

            console.log(`✅ Created ${r.role} for ${body.name}`)
        }
    }

    console.log("🎉 Staff seeding completed.")
}

seedStaff()  