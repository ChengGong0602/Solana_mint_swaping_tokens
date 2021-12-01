use anchor_lang::prelude::*;
// to manage spl-tokens (VER-index, USDC)
use anchor_spl::token::{self, Mint, MintTo, Burn, TokenAccount, Token, Transfer};
use std::ops::Deref;

declare_id!("9WNvE8cqebwN8uvAAQ6X5Wk3RvGrknL1y3p7F6ygbs1w");

// VER-index token
const VER_DECIMALS: u8 = 8;
// USD coin
const DECIMALS: u8 = 6;

#[program]
pub mod vera_contract {
    use super::*;

    // initialize all infos of tokens and pool
    pub fn initialize(
        ctx: Context<Initialize>,
        deposite_title: String,
        bumps: PoolBumps
    ) -> ProgramResult {
        msg!("INITIALIZE POOL");
        
        let deposite_account = &mut ctx.accounts.deposite_account;

        let name_bytes = deposite_title.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        deposite_account.deposite_title = name_data;
        deposite_account.bumps = bumps;

        deposite_account.deposite_authority = ctx.accounts.deposite_authority.key();
        deposite_account.usdc_mint = ctx.accounts.usdc_mint.key();
        deposite_account.redeemable_mint = ctx.accounts.redeemable_mint.key();
        deposite_account.pool_usdc = ctx.accounts.pool_usdc.key();

        Ok(())
    }

    // deposite USDC stable coin -> mint VER-index token
    pub fn deposit_usdc_for_redeemable(
        ctx: Context<DepositeUsdcForRedeemable>, 
        amount: u64,
        ver_amount: u64
    ) -> ProgramResult {
        msg!("DEPOSIT USDC FOR REDEEMABLE");
        // While token::transfer will check this, we prefer a verbose err msg.
        if ctx.accounts.user_usdc.amount < amount {
            return Err(ErrorCode::LowUsdc.into());
        }

        // // Transfer user's USDC to pool USDC account.
        let cpi_accounts = Transfer {
            // depositer address (user address)
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.pool_usdc.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Mint VER-index to user Redeemable account.
        let deposite_title = ctx.accounts.deposite_account.deposite_title.as_ref();
        let seeds = &[
            deposite_title.trim_ascii_whitespace(),
            &[ctx.accounts.deposite_account.bumps.deposite_account],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.redeemable_mint.to_account_info(),
            to: ctx.accounts.user_redeemable.to_account_info(),
            authority: ctx.accounts.deposite_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        // msg!("VER Amount" + ver_amount.)
        token::mint_to(cpi_ctx, ver_amount)?;

        Ok(())
    }

    pub fn init_user_redeemable(_ctx: Context<InitUserRedeemable>) -> ProgramResult {
        msg!("INIT USER REDEEMABLE");
        Ok(())
    }


    // withdraw usdc from usdc_pool
    pub fn withdraw_redeemable_for_usdc(
        ctx: Context<WithdrawRedeemableForUsdc>,
        amount: u64,
    ) -> ProgramResult {
        msg!("WITHDRAW REDEEMABLE FOR USDC");
        // While token::burn will check this, we prefer a verbose err msg.
        if ctx.accounts.user_redeemable.amount < amount {
            return Err(ErrorCode::LowRedeemable.into());
        }

        let deposite_title = ctx.accounts.deposite_account.deposite_title.as_ref();
        let seeds = &[
            deposite_title.trim_ascii_whitespace(),
            &[ctx.accounts.deposite_account.bumps.deposite_account],
        ];
        let signer = &[&seeds[..]];

        // Burn the user's redeemable tokens.
        let cpi_accounts = Burn {
            mint: ctx.accounts.redeemable_mint.to_account_info(),
            to: ctx.accounts.user_redeemable.to_account_info(),
            authority: ctx.accounts.deposite_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::burn(cpi_ctx, amount)?;

        // Transfer USDC from pool account to the user's account.
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_usdc.to_account_info(),
            to: ctx.accounts.user_usdc.to_account_info(),
            authority: ctx.accounts.deposite_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        let usdc_amount = amount; 
        token::transfer(cpi_ctx, usdc_amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(deposite_title: String, bumps: PoolBumps)]
pub struct Initialize<'info> {
    // Contract Authority accounts
    #[account(mut)]
    pub deposite_authority: Signer<'info>,
    // IDO Accounts
    #[account(init,
        seeds = [deposite_title.as_bytes()],
        bump = bumps.deposite_account,
        payer = deposite_authority)]
    pub deposite_account: Account<'info, DepositeAccount>,
    // TODO Confirm USDC mint address on mainnet or leave open as an option for other stables
    #[account(constraint = usdc_mint.decimals == DECIMALS)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(init,
        mint::decimals = VER_DECIMALS,
        mint::authority = deposite_account,
        seeds = [deposite_title.as_bytes(), b"redeemable_mint".as_ref()],
        bump = bumps.redeemable_mint,
        payer = deposite_authority)]
    pub redeemable_mint: Account<'info, Mint>,
    #[account(init,
        token::mint = usdc_mint,
        token::authority = deposite_account,
        seeds = [deposite_title.as_bytes(), b"pool_usdc".as_ref()],
        bump = bumps.pool_usdc,
        payer = deposite_authority)]
    pub pool_usdc: Account<'info, TokenAccount>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositeUsdcForRedeemable<'info> {
    // User Accounts
    pub user_authority: Signer<'info>,
    // TODO replace these with the ATA constraints when possible
    #[account(mut,
        constraint = user_usdc.owner == user_authority.key(),
        constraint = user_usdc.mint == usdc_mint.key())]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut,
        seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(),
            b"user_redeemable".as_ref()],
        bump)]
    pub user_redeemable: Account<'info, TokenAccount>,
    // IDO Accounts
    #[account(seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace()],
        bump = deposite_account.bumps.deposite_account,
        has_one = usdc_mint)]
    pub deposite_account: Account<'info, DepositeAccount>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut,
        seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(), b"redeemable_mint".as_ref()],
        bump = deposite_account.bumps.redeemable_mint)]
    pub redeemable_mint: Account<'info, Mint>,
    #[account(mut,
        seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(), b"pool_usdc".as_ref()],
        bump = deposite_account.bumps.pool_usdc)]
    pub pool_usdc: Account<'info, TokenAccount>,
    // // Programs and Sysvars
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitUserRedeemable<'info> {
    // User Accounts
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(init,
        token::mint = redeemable_mint,
        token::authority = deposite_account,
        seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(),
            b"user_redeemable".as_ref()],
        bump,
        payer = user_authority)]
    pub user_redeemable: Account<'info, TokenAccount>,
    // IDO Accounts
    #[account(seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace()],
        bump = deposite_account.bumps.deposite_account)]
    pub deposite_account: Account<'info, DepositeAccount>,
    #[account(seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(), b"redeemable_mint".as_ref()],
        bump = deposite_account.bumps.redeemable_mint)]
    pub redeemable_mint: Account<'info, Mint>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawRedeemableForUsdc<'info> {
    // User Accounts
    pub user_authority: Signer<'info>,
    // TODO replace these with the ATA constraints when possible
    #[account(mut,
        constraint = user_usdc.owner == user_authority.key(),
        constraint = user_usdc.mint == usdc_mint.key())]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut,
        seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(),
            b"user_redeemable"],
        bump)]
    pub user_redeemable: Account<'info, TokenAccount>,
    // Deposite Accounts
    #[account(seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace()],
        bump = deposite_account.bumps.deposite_account,
        has_one = usdc_mint)]
    pub deposite_account: Account<'info, DepositeAccount>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut,
        seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(), b"redeemable_mint".as_ref()],
        bump = deposite_account.bumps.redeemable_mint)]
    pub redeemable_mint: Account<'info, Mint>,
    #[account(mut,
        seeds = [deposite_account.deposite_title.as_ref().trim_ascii_whitespace(), b"pool_usdc".as_ref()],
        bump = deposite_account.bumps.pool_usdc)]
    pub pool_usdc: Account<'info, TokenAccount>,
    // Programs and Sysvars
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(Default)]
pub struct DepositeAccount {
    pub deposite_title: [u8; 10], // Setting an arbitrary max of ten characters in the ido name.
    pub bumps: PoolBumps,
    pub deposite_authority: Pubkey,

    pub usdc_mint: Pubkey,
    pub redeemable_mint: Pubkey,
    pub pool_usdc: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct PoolBumps {
    pub deposite_account: u8,
    pub redeemable_mint: u8,
    pub pool_usdc: u8,
}

#[error]
pub enum ErrorCode {
    #[msg("Insufficient USDC")]
    LowUsdc,
    #[msg("Insufficient redeemable tokens")]
    LowRedeemable,
    #[msg("USDC total and redeemable total don't match")]
    UsdcNotEqRedeem,
}

/// Trait to allow trimming ascii whitespace from a &[u8].
pub trait TrimAsciiWhitespace {
    /// Trim ascii whitespace (based on `is_ascii_whitespace()`) from the
    /// start and end of a slice.
    fn trim_ascii_whitespace(&self) -> &[u8];
}

impl<T: Deref<Target = [u8]>> TrimAsciiWhitespace for T {
       
    fn trim_ascii_whitespace(&self) -> &[u8] {
        let from = match self.iter().position(|x| !x.is_ascii_whitespace()) {
            Some(i) => i,
            None => return &self[0..0],
        };
        let to = self.iter().rposition(|x| !x.is_ascii_whitespace()).unwrap();
        &self[from..=to]
    }
}